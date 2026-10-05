"use client";

import { useEffect, useState } from "react";
import { createAVPortraitBrowserAdapter } from "@/lib/aerovista/browser";

export default function PortraitAuthCallbackPage() {
  const [message, setMessage] = useState("Completing AeroVista sign in…");

  useEffect(() => {
    createAVPortraitBrowserAdapter()
      .auth.completeLogin()
      .then(({ next }) => window.location.replace(next))
      .catch((error) => setMessage(error instanceof Error ? error.message : "Sign in failed."));
  }, []);

  return (
    <main className="authShell">
      <section className="authCard">
        <div className="eyebrow">AV Portrait</div>
        <h1>{message}</h1>
      </section>
    </main>
  );
}
