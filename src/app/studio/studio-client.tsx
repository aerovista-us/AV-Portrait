"use client";

import { FormEvent, useState } from "react";

type GenerationResult = {
  image?: string;
  provider?: string;
  requestId?: string;
  error?: string;
};

export default function StudioClient() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);

    try {
      const response = await fetch("/api/portrait/generate", {
        method: "POST",
        body: new FormData(event.currentTarget),
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

  return (
    <section className="panel">
      <form className="formStack" onSubmit={generate}>
        <div className="field">
          <label htmlFor="subjectName">Subject name</label>
          <input id="subjectName" name="subjectName" maxLength={80} required placeholder="Your name" />
        </div>
        <div className="field">
          <label htmlFor="images">Authorized reference photos</label>
          <input id="images" name="images" type="file" accept="image/png,image/jpeg,image/webp" multiple required />
          <span className="fieldHint">Use 1–5 clear photos of the same consenting adult.</span>
        </div>
        <div className="field">
          <label htmlFor="preset">Portrait direction</label>
          <select id="preset" name="preset" defaultValue="executive">
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
            <a className="button ghost" href={result.image} download="av-portrait.png">Save image</a>
            <button className="button ghost" type="button" onClick={() => checkout("professional")}>Unlock Professional pack</button>
          </div>
        </div>
      )}
    </section>
  );
}
