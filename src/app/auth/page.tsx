"use client";

import { createAVPortraitBrowserAdapter } from "@/lib/aerovista/browser";
import { safePortraitNext } from "@/lib/aerovista/config";

export default function PortraitAuthPage() {
  return (
    <main className="authShell">
      <section className="authCard">
        <div className="eyebrow">AV Portrait</div>
        <h1>AeroVista sign in required</h1>
        <p>
          Portrait Studio uses your AeroVista Account and live AVCC authorization.
          Displayed roles never substitute for a capability decision.
        </p>
        <button
          className="button"
          onClick={() => {
            const next = safePortraitNext(new URLSearchParams(window.location.search).get("next"));
            createAVPortraitBrowserAdapter().auth.beginLogin({ next });
          }}
        >
          Sign in with AeroVista
        </button>
      </section>
    </main>
  );
}
