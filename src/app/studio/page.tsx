import Link from "next/link";
import { redirect } from "next/navigation";
import StudioClient from "./studio-client";
import { checkPortraitCapability } from "@/lib/aerovista/session";
import { PORTRAIT_CAPABILITIES } from "@/lib/aerovista/config";

export const metadata = {
  title: "Studio",
  description: "Create an authorized professional portrait set.",
};

export default async function StudioPage() {
  const access = await checkPortraitCapability(PORTRAIT_CAPABILITIES.access);
  if (!access.allowed || !access.session) redirect("/auth?next=/studio");

  return (
    <main className="studioPage">
      <header className="studioHeader shell">
        <Link className="backLink" href="/">← AV Portrait</Link>
        <span className="sessionIdentity">{access.session.identity.name || access.session.identity.email || "AeroVista account"}</span>
      </header>
      <div className="studioLayout shell">
        <section className="studioIntro">
          <div className="eyebrow">Portrait Studio</div>
          <h1>Keep the person.<br />Change the presentation.</h1>
          <p>
            Use clear authorized reference photos. AV Portrait asks the generation
            provider to preserve identity while changing professional context,
            wardrobe, lighting and framing.
          </p>
        </section>
        <StudioClient />
      </div>
    </main>
  );
}
