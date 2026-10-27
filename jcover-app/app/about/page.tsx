import type { Metadata } from "next";
import { PORTFOLIO_URL } from "@/lib/site";

export const metadata: Metadata = { title: "About", description: "Why JCover exists and who it is for." };

export default function About() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-12">
      <h1 className="text-3xl font-bold">About JCover</h1>
      <p className="text-navy-500">JCover helps university and college students create clean academic cover pages without fighting a word processor. It is designed first for students in Bangladesh and works for students anywhere.</p>
      <h2 className="pt-4 text-xl font-semibold">Who it is for</h2>
      <p className="text-navy-500">Anyone submitting assignments, lab reports, project or internship reports, research papers, theses and case studies, individually or in groups.</p>
      <h2 className="pt-4 text-xl font-semibold">Our approach to formatting</h2>
      <p className="text-navy-500">Every template has its own real PDF and Word renderer, built from the same layout definitions as the on-screen preview. The Word file is made of real text and tables so you can keep editing it. Templates are general-purpose, so please confirm your institution&apos;s own requirements before you submit.</p>
      <h2 className="pt-4 text-xl font-semibold">Private by design</h2>
      <p className="text-navy-500">Everything happens in your browser. Your details and logo are never uploaded: the preview, the PDF and the Word file are all generated on your own device.</p>
      <h2 className="pt-4 text-xl font-semibold">Credits</h2>
      <p className="text-navy-500">JCover is a team project, first released as CoverCraft. This version is maintained by Jerome M. Del Rosario and lives in <a className="font-medium text-brand-700 underline" href={PORTFOLIO_URL}>Jerome&apos;s portfolio</a>.</p>
    </article>
  );
}
