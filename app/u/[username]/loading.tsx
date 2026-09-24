// Instant skeleton shown while the profile server component fetches. Without this,
// navigating to /u/<username> hangs on a blank screen until SSR resolves (the "lag").
export default function ProfileLoading() {
  return (
    <main className="profile-page">
      <section className="profile-hero panel">
        <div className="profile-hero-main">
          <div className="sk sk-avatar" />
          <div className="profile-id" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="sk sk-line" style={{ width: "55%", height: 20 }} />
            <div className="sk sk-line" style={{ width: "35%", height: 13 }} />
            <div className="sk sk-line" style={{ width: "45%", height: 12 }} />
          </div>
        </div>
        <div className="profile-social">
          <div className="sk sk-line" style={{ width: 140, height: 14 }} />
          <div className="sk sk-line" style={{ width: 90, height: 32, borderRadius: 8 }} />
        </div>
      </section>
      <section className="profile-activity">
        <div className="sk sk-line" style={{ width: 120, height: 16, margin: "22px 2px 12px" }} />
        {[0, 1, 2].map((i) => (
          <div key={i} className="sk sk-line" style={{ height: 44, marginBottom: 8, borderRadius: 12 }} />
        ))}
      </section>
    </main>
  );
}
