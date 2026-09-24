import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Fitrack handles your data.",
};

const UPDATED = "September 24, 2026";
const CONTACT = "bhatsarthik28@gmail.com";

export default function PrivacyPage() {
  return (
    <>
      <h1 className="legal-title cond">Privacy Policy</h1>
      <p className="legal-updated">Last updated: {UPDATED}</p>

      <p>
        Fitrack is a local-first fitness tracker. Your workouts, nutrition logs, bodyweight history,
        and settings are stored on your own device by default. This policy explains what data we
        handle, when, and why.
      </p>

      <h2>Data stored on your device</h2>
      <p>
        By default, everything you enter - programs, workout sessions, food diary, bodyweight, goals,
        and preferences - lives only in your browser&rsquo;s local storage (IndexedDB) on the device you
        use. If you never sign in, this data never leaves your device and we never see it. Clearing your
        browser data or uninstalling the app removes it.
      </p>

      <h2>Optional account &amp; cloud sync</h2>
      <p>
        Signing in with Google is optional. It exists so you can sync your data across devices and use
        the social features (public profile, sharing plans, following people, and the activity feed).
        When you sign in, we receive basic Google account details - your name, email address, and
        profile picture - to create your account. We do not request access to your Google Fit, Health,
        Calendar, Contacts, or any other Google data.
      </p>
      <p>When you are signed in, the following may be stored in our cloud database:</p>
      <ul>
        <li>Your profile: display name, username, avatar, and bio.</li>
        <li>Your synced tracker data: programs, sessions, nutrition, bodyweight, goals, and settings.</li>
        <li>Social data: who you follow, and activity you choose to post, along with likes and comments.</li>
      </ul>
      <p>
        Sharing a workout to the activity feed is opt-in and controlled by a setting you can turn off at
        any time. Public profiles and shared plan links are visible to anyone who has the link.
      </p>

      <h2>Service providers</h2>
      <p>We rely on a small set of third parties to run the app:</p>
      <ul>
        <li>
          <strong>Supabase</strong> - hosts our database and authentication for accounts and cloud sync.
        </li>
        <li>
          <strong>Google</strong> - provides optional sign-in (OAuth).
        </li>
        <li>
          <strong>Exercise and food data providers</strong> - we fetch public exercise information and
          food nutrition facts (for example, from open food databases) to power the library and food
          search. These lookups do not include your personal data.
        </li>
        <li>
          <strong>Vercel</strong> - hosts and serves the application.
        </li>
      </ul>

      <h2>What we do not do</h2>
      <ul>
        <li>We do not sell your data.</li>
        <li>We do not show ads or run advertising trackers.</li>
        <li>We do not access Google health, fitness, or wearable data.</li>
      </ul>

      <h2>Your choices &amp; rights</h2>
      <p>
        You can use Fitrack fully without an account. If you have an account, you can edit or delete your
        profile and synced data, turn off workout sharing, and remove posts you have made. To request
        deletion of your account and associated cloud data, contact us at the address below.
      </p>

      <h2>Children</h2>
      <p>
        Fitrack is not directed to children under 13, and we do not knowingly collect data from them.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy as the app evolves. Material changes will be reflected by the
        &ldquo;Last updated&rdquo; date above.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </>
  );
}
