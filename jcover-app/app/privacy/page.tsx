import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy", description: "What JCover collects and how it is used." };

export default function Privacy() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-12">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="text-sm text-navy-500">Initial version. This describes how the current guest-mode version behaves.</p>
      <h2 className="pt-4 text-xl font-semibold">What we handle</h2>
      <p className="text-navy-500">The details you type (names, student IDs, course and institution information) and an optional logo image. JCover builds the preview and your PDF or Word file entirely in your browser, so this information is never sent to a server.</p>
      <h2 className="pt-4 text-xl font-semibold">Retention</h2>
      <p className="text-navy-500">Nothing you enter is stored anywhere except your own browser. Your draft (without the logo) is saved in your own browser&apos;s local storage so you do not lose work; use &ldquo;Reset form&rdquo; or clear your browser data to remove it.</p>
      <h2 className="pt-4 text-xl font-semibold">Accounts and deletion</h2>
      <p className="text-navy-500">There are no accounts, so there is no account data to delete. Feedback is sent from your own email app, so it is handled like any other email you send.</p>
      <h2 className="pt-4 text-xl font-semibold">Hosting providers</h2>
      <p className="text-navy-500">The site is hosted on GitHub Pages, which may keep standard technical logs such as IP addresses when pages are requested.</p>
    </article>
  );
}
