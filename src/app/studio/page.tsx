import Link from "next/link";
import StudioClient from "./studio-client";

export const metadata = {
  title: "Studio",
  description: "Create an authorized professional portrait set.",
};

export default function StudioPage() {
  return (
    <main className="studioPage">
      <header className="studioHeader shell">
        <Link className="backLink" href="/">← AV Portrait</Link>
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
