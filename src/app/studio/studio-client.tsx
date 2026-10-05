"use client";

import { FormEvent, useEffect, useState } from "react";

type GenerationResult = {
  image?: string;
  provider?: string;
  requestId?: string;
  error?: string;
};

type Profile = {
  subjectLabel: string;
  preferredPreset: string;
  wardrobeNotes: string;
  backgroundNotes: string;
  framingNotes: string;
  appearanceNotes: string;
  updatedAt: string;
};

type Entitlement = {
  entitlementId: string;
  planId: string;
  status: string;
  generationUnits: number;
};

async function compressReference(file: File) {
  const bitmap = await createImageBitmap(file);
  const maxEdge = 1400;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image preparation is unavailable in this browser.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => value ? resolve(value) : reject(new Error("Could not prepare reference photo.")),
      "image/jpeg",
      0.8,
    );
  });

  if (blob.size > 1024 * 1024) {
    const retry = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) => value ? resolve(value) : reject(new Error("Could not prepare reference photo.")),
        "image/jpeg",
        0.62,
      );
    });
    return new File([retry], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  }

  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

export default function StudioClient() {
  const [busy, setBusy] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [profileMessage, setProfileMessage] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/profile", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/entitlements", { cache: "no-store" }).then((response) => response.json()),
    ]).then(([profilePayload, entitlementPayload]) => {
      if (profilePayload?.profile) setProfile(profilePayload.profile);
      if (Array.isArray(entitlementPayload?.entitlements)) setEntitlements(entitlementPayload.entitlements);
    }).catch(() => null);
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileBusy(true);
    setProfileMessage("");

    const form = new FormData(event.currentTarget);
    const body = {
      subjectLabel: String(form.get("profileSubjectLabel") || ""),
      preferredPreset: String(form.get("profilePreset") || "executive"),
      wardrobeNotes: String(form.get("wardrobeNotes") || ""),
      backgroundNotes: String(form.get("backgroundNotes") || ""),
      framingNotes: String(form.get("framingNotes") || ""),
      appearanceNotes: String(form.get("appearanceNotes") || ""),
      consentConfirmed: form.get("profileConsent") === "yes",
    };

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Profile save failed.");
      setProfile(payload.profile);
      setProfileMessage("Visual Identity Profile saved.");
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Profile save failed.");
    } finally {
      setProfileBusy(false);
    }
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);

    try {
      const body = new FormData(event.currentTarget);
      const sourceFiles = body.getAll("images").filter((value): value is File => value instanceof File);
      if (sourceFiles.length < 1 || sourceFiles.length > 5) {
        throw new Error("Choose between 1 and 5 reference photos.");
      }

      body.delete("images");
      const prepared = await Promise.all(sourceFiles.map(compressReference));
      const totalBytes = prepared.reduce((sum, file) => sum + file.size, 0);
      if (totalBytes > 4 * 1024 * 1024) {
        throw new Error("These photos are still too large after preparation. Try fewer photos.");
      }
      prepared.forEach((file) => body.append("images", file, file.name));

      const response = await fetch("/api/portrait/generate", {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as GenerationResult;
      if (!response.ok) throw new Error(payload.error || "Generation failed.");
      setResult(payload);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Generation failed." });
    } finally {
      setBusy(false);
    }
  }

  async function checkout(plan: string) {
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || "Unable to start checkout.");
      window.location.assign(payload.url);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Checkout failed." });
      setBusy(false);
    }
  }

  const activeUnits = entitlements
    .filter((item) => item.status === "active")
    .reduce((total, item) => total + Number(item.generationUnits || 0), 0);

  return (
    <div className="studioStack">
      <section className="panel identityPanel">
        <div className="panelHeading">
          <div>
            <span className="stepNum">VISUAL IDENTITY PROFILE</span>
            <h2>Tell the system what must stay consistent.</h2>
          </div>
          <span className="entitlementBadge">{activeUnits} paid generation units</span>
        </div>

        <form className="formStack" onSubmit={saveProfile}>
          <div className="field">
            <label htmlFor="profileSubjectLabel">Subject label</label>
            <input
              id="profileSubjectLabel"
              name="profileSubjectLabel"
              defaultValue={profile?.subjectLabel || ""}
              placeholder="Your name"
              maxLength={80}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="profilePreset">Default portrait direction</label>
            <select id="profilePreset" name="profilePreset" defaultValue={profile?.preferredPreset || "executive"} key={profile?.preferredPreset || "executive"}>
              <option value="executive">Executive / leadership</option>
              <option value="realtor">Real estate professional</option>
              <option value="trades">Contractor / trades professional</option>
              <option value="creative">Creative professional</option>
              <option value="directory">Clean team directory</option>
            </select>
          </div>

          <div className="profileGrid">
            <div className="field">
              <label htmlFor="wardrobeNotes">Wardrobe continuity</label>
              <textarea id="wardrobeNotes" name="wardrobeNotes" defaultValue={profile?.wardrobeNotes || ""} placeholder="Preferred wardrobe, colors, formality." />
            </div>
            <div className="field">
              <label htmlFor="backgroundNotes">Background continuity</label>
              <textarea id="backgroundNotes" name="backgroundNotes" defaultValue={profile?.backgroundNotes || ""} placeholder="Studio, office, property, neutral, environmental." />
            </div>
            <div className="field">
              <label htmlFor="framingNotes">Framing</label>
              <textarea id="framingNotes" name="framingNotes" defaultValue={profile?.framingNotes || ""} placeholder="Head and shoulders, chest-up, eye line, crop preferences." />
            </div>
            <div className="field">
              <label htmlFor="appearanceNotes">Appearance notes</label>
              <textarea id="appearanceNotes" name="appearanceNotes" defaultValue={profile?.appearanceNotes || ""} placeholder="Glasses, facial hair, hairstyle, distinguishing presentation details." />
            </div>
          </div>

          <label className="checkLine">
            <input name="profileConsent" type="checkbox" value="yes" required />
            <span>I confirm this profile describes me or a consenting adult I am authorized to represent.</span>
          </label>

          <div className="actionRow">
            <button className="button ghost" type="submit" disabled={profileBusy}>
              {profileBusy ? "Saving…" : "Save Visual Identity Profile"}
            </button>
            {profile?.updatedAt && <span className="fieldHint">Last saved {new Date(profile.updatedAt).toLocaleString()}</span>}
          </div>
          {profileMessage && <p className="fieldHint" role="status">{profileMessage}</p>}
        </form>
      </section>

      <section className="panel">
        <div className="panelHeading">
          <div>
            <span className="stepNum">GENERATION</span>
            <h2>Create an authorized portrait.</h2>
          </div>
        </div>

        <form className="formStack" onSubmit={generate}>
          <div className="field">
            <label htmlFor="subjectName">Subject name</label>
            <input id="subjectName" name="subjectName" maxLength={80} required placeholder="Your name" defaultValue={profile?.subjectLabel || ""} key={profile?.subjectLabel || "empty"} />
          </div>
          <div className="field">
            <label htmlFor="images">Authorized reference photos</label>
            <input id="images" name="images" type="file" accept="image/png,image/jpeg,image/webp" multiple required />
            <span className="fieldHint">Use 1–5 clear photos of the same consenting adult. Photos are resized and compressed in your browser before upload; the Visual Identity Profile stores preferences, not biometric embeddings.</span>
          </div>
          <div className="field">
            <label htmlFor="preset">Portrait direction</label>
            <select id="preset" name="preset" defaultValue={profile?.preferredPreset || "executive"} key={"gen-" + (profile?.preferredPreset || "executive")}>
              <option value="executive">Executive / leadership</option>
              <option value="realtor">Real estate professional</option>
              <option value="trades">Contractor / trades professional</option>
              <option value="creative">Creative professional</option>
              <option value="directory">Clean team directory</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="direction">Optional direction</label>
            <textarea id="direction" name="direction" maxLength={700} placeholder="Dark charcoal jacket, warm office light, chest-up framing, calm and approachable." />
            <span className="fieldHint">Describe presentation changes only. Identity-preservation instructions are added automatically.</span>
          </div>
          <fieldset className="consentBox">
            <legend className="fieldLegend">Authorization</legend>
            <label className="checkLine"><input name="adult" type="checkbox" value="yes" required /><span>I confirm the subject is 18 or older.</span></label>
            <label className="checkLine"><input name="authorized" type="checkbox" value="yes" required /><span>I am the subject or I have explicit permission from the subject to create and use these portraits.</span></label>
            <label className="checkLine"><input name="rights" type="checkbox" value="yes" required /><span>I have the right to upload these reference photos.</span></label>
          </fieldset>
          <button className="button" type="submit" disabled={busy}>{busy ? "Creating portrait…" : "Generate authorized portrait"}</button>
        </form>

        {result?.error && <p className="status error" role="alert">{result.error}</p>}
        {result?.image && (
          <div className="status success">
            <strong>Portrait generated.</strong>
            <img className="resultImage" src={result.image} alt="Generated professional portrait result" />
            <p>Review likeness carefully before using the image publicly.</p>
            <div className="actionRow">
              <a className="button ghost" href={result.image} download="av-portrait.jpg">Save image</a>
              <button className="button ghost" type="button" onClick={() => checkout("professional")}>Unlock Professional pack</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
