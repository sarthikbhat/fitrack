import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using Fitrack.",
};

const UPDATED = "September 24, 2026";
const CONTACT = "bhatsarthik28@gmail.com";

export default function TermsPage() {
  return (
    <>
      <h1 className="legal-title cond">Terms of Service</h1>
      <p className="legal-updated">Last updated: {UPDATED}</p>

      <p>
        These terms govern your use of Fitrack (the &ldquo;Service&rdquo;). By using the Service, you
        agree to them. If you do not agree, please do not use the Service.
      </p>

      <h2>The Service</h2>
      <p>
        Fitrack is a local-first fitness tracker. You can use it without an account, with your data
        stored on your device. An optional account enables cloud sync and social features. The Service is
        provided free of charge and may change or add features over time.
      </p>

      <h2>Not medical advice</h2>
      <p>
        Fitrack is for general fitness tracking and informational purposes only. It is not medical
        advice and is not a substitute for consultation with a qualified healthcare professional. Consult
        a professional before starting any exercise or nutrition program. You use the Service, and follow
        any workout or diet you track with it, at your own risk.
      </p>

      <h2>Your account</h2>
      <p>
        If you sign in, you are responsible for the activity under your account and for keeping access to
        your Google account secure. You must provide accurate profile information and not impersonate
        others.
      </p>

      <h2>Your content &amp; conduct</h2>
      <p>
        You retain ownership of the content you create (profile details, plans, posts, comments). By
        posting content to public areas - your public profile, shared plan links, or the activity feed -
        you grant us permission to store and display it as needed to operate those features. You agree not
        to:
      </p>
      <ul>
        <li>post unlawful, harassing, hateful, or infringing content;</li>
        <li>spam, scrape, or abuse other users or the Service;</li>
        <li>attempt to break, overload, or gain unauthorized access to the Service or its data;</li>
        <li>misuse the sharing and social features to harm others.</li>
      </ul>
      <p>We may remove content or suspend accounts that violate these terms.</p>

      <h2>Third-party data</h2>
      <p>
        Exercise information and food nutrition facts shown in the Service come from third-party and open
        data sources. We provide this information as-is and do not guarantee its accuracy or
        completeness.
      </p>

      <h2>No warranty</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of
        any kind, express or implied. We do not warrant that the Service will be uninterrupted,
        error-free, or that data will never be lost. Keep your own backups of anything important.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, we are not liable for any indirect, incidental, or
        consequential damages, or for any loss of data, arising from your use of the Service.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using the Service at any time and delete your account. We may suspend or terminate
        access if you violate these terms or to protect the Service and its users.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms as the Service evolves. Continued use after changes take effect means
        you accept the updated terms. The &ldquo;Last updated&rdquo; date above reflects the latest
        version.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </>
  );
}
