// Public profile page - server component (SSR). Reads the profile via a server
// Supabase client using the public SELECT RLS policy (anon key), so it renders
// for signed-in and signed-out visitors alike. 404s when the username is unknown.
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { ProfileFollow } from "@/components/ProfileFollow";
import { getProfileByUsername } from "@/lib/profile";
import { getFollowCounts } from "@/lib/social";
import { getUserActivity, sessionActivityText } from "@/lib/feed";
import { getServerSupabase } from "@/lib/supabaseServer";

function activityDate(created_at: string): string {
  const d = new Date(created_at);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function joinedLabel(created_at: string | null): string | null {
  if (!created_at) return null;
  const d = new Date(created_at);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const server = getServerSupabase();
  const profile = await getProfileByUsername(username, server);
  if (!profile) notFound();

  // counts + activity are independent - fetch them in parallel (one round-trip
  // instead of two) to cut the profile page's load latency.
  const [counts, activity] = await Promise.all([
    getFollowCounts(profile.id, server),
    getUserActivity(profile.id, server),
  ]);

  const displayName = profile.display_name || profile.username || "Athlete";
  const joined = joinedLabel(profile.created_at);

  return (
    <main className="profile-page">
      <section className="profile-hero panel">
        <div className="profile-hero-main">
          <Avatar src={profile.avatar_url} name={displayName} size={72} />
          <div className="profile-id">
            <h1 className="profile-name">{displayName}</h1>
            {profile.username && <div className="profile-handle">@{profile.username}</div>}
            {joined && <div className="profile-joined">Joined {joined}</div>}
          </div>
        </div>
        <ProfileFollow
          profileId={profile.id}
          followers={counts.followers}
          following={counts.following}
        />
      </section>

      {profile.bio && <p className="profile-bio">{profile.bio}</p>}

      <section className="profile-activity">
        <h2 className="profile-section-title">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="empty">No activity yet.</p>
        ) : (
          <div className="profile-activity-list">
            {activity.map((a) => (
              <div key={a.id} className="profile-activity-row panel">
                <span className="profile-activity-text">{sessionActivityText(a.data)}</span>
                <span className="profile-activity-date">{activityDate(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
