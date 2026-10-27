"use client";

import { useState } from "react";
import { CONTACT_EMAIL } from "@/lib/site";

export default function FeedbackPage() {
  const [f, setF] = useState({ name: "", message: "" });
  const [error, setError] = useState("");
  const [opened, setOpened] = useState(false);

  // Feedback goes out through the visitor's own email app; there is no server to collect it.
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.message.trim()) return setError("Please write a message.");
    if (f.message.length > 2000) return setError("Keep it under 2000 characters.");
    setError("");
    const body = f.name.trim() ? `${f.message.trim()}\n\n— ${f.name.trim()}` : f.message.trim();
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("JCover feedback")}&body=${encodeURIComponent(body)}`;
    setOpened(true);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold">Feedback</h1>
      <p className="mb-6 mt-2 text-navy-500">Found a layout problem or have an idea? Tell us.</p>
      <form onSubmit={submit} noValidate className="card space-y-4 p-6">
        <div><label htmlFor="fb-name" className="label">Name (optional)</label>
          <input id="fb-name" className="input" maxLength={100} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label htmlFor="fb-msg" className="label">Message <span className="text-red-600" aria-hidden="true">*</span></label>
          <textarea id="fb-msg" rows={5} className="input" value={f.message} aria-invalid={!!error} onChange={(e) => setF({ ...f, message: e.target.value })} />
          {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}</div>
        <button type="submit" className="btn-primary">Send feedback</button>
        <p className="text-xs text-navy-500">Opens your email app with the message ready to send to {CONTACT_EMAIL}.</p>
        <div aria-live="polite">
          {opened && <p className="text-sm text-emerald-700">Your email app should now be open. Thank you!</p>}
        </div>
      </form>
    </div>
  );
}
