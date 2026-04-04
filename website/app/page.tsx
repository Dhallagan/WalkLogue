export default function Home() {
  return (
    <>
      {/* Hero */}
      <section
        style={{
          minHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 18,
            backgroundColor: "#F6F2EA",
            border: "1px solid #DDD8CF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            marginBottom: 32,
          }}
        >
          {"\uD83D\uDEB6"}
        </div>

        <h1
          style={{
            fontSize: 56,
            fontWeight: 300,
            letterSpacing: -2.5,
            margin: "0 0 12px",
            color: "#4F4A44",
          }}
        >
          WalkLog
        </h1>

        <p
          style={{
            fontSize: 22,
            fontWeight: 300,
            color: "#8E8982",
            margin: "0 0 48px",
            maxWidth: 400,
            lineHeight: 1.5,
          }}
        >
          Journal your walks. Remember your days.
        </p>

        <a
          href="https://apps.apple.com/app/id6760596235"
          style={{
            display: "inline-block",
            marginBottom: 16,
          }}
        >
          <img
            src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
            alt="Download on the App Store"
            style={{ height: 54 }}
          />
        </a>

        <p
          style={{
            fontSize: 13,
            color: "#8E8982",
            margin: 0,
          }}
        >
          Free on iPhone. No account needed.
        </p>
      </section>

      {/* How it works */}
      <section
        style={{
          padding: "80px 24px",
          maxWidth: 800,
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#8E8982",
            margin: "0 0 48px",
            textAlign: "center",
          }}
        >
          How it works
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 40,
          }}
        >
          <Feature
            number="1"
            title="Walk and talk"
            description="Hit record, lock your phone, and start walking. Talk about your day, your thoughts, whatever comes to mind."
          />
          <Feature
            number="2"
            title="Auto-transcribed"
            description="When you end your walk, your voice is transcribed into a journal entry. Steps are tracked automatically."
          />
          <Feature
            number="3"
            title="Ask your journal"
            description="Search your memories by asking questions. 'When did I last go to the sauna?' The AI reads your whole journal to answer."
          />
        </div>
      </section>

      {/* Features */}
      <section
        style={{
          padding: "80px 24px",
          backgroundColor: "#F6F2EA",
        }}
      >
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: 32,
              fontWeight: 300,
              letterSpacing: -1,
              color: "#4F4A44",
              margin: "0 0 40px",
              textAlign: "center",
            }}
          >
            Your journal, your device
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Detail
              title="Private by default"
              text="All entries are stored locally on your iPhone. No cloud, no servers, no accounts. Uninstall and it's gone."
            />
            <Detail
              title="Dark mode"
              text="Journal at night without burning your retinas. Light and dark themes that switch in one tap."
            />
            <Detail
              title="Weekly reflections"
              text="Every Sunday, get an AI-generated digest of your week. What you wrote about, how many steps, what's on your mind."
            />
            <Detail
              title="Step tracking"
              text="Apple Health or Fitbit. Your step count shows up on the home screen and gets saved with every walk entry."
            />
            <Detail
              title="Retroactive entries"
              text="Forgot to record yesterday? Tap the empty day in your log and record a voice entry backdated to that date."
            />
            <Detail
              title="Search everything"
              text="Full-text search across all your entries. Find any day, any topic, any memory."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: "48px 24px",
          textAlign: "center",
          borderTop: "1px solid #DDD8CF",
        }}
      >
        <nav
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 32,
            marginBottom: 24,
          }}
        >
          <a href="/privacy" style={{ color: "#8E8982", fontSize: 14, textDecoration: "none" }}>
            Privacy Policy
          </a>
          <a href="/support" style={{ color: "#8E8982", fontSize: 14, textDecoration: "none" }}>
            Support
          </a>
          <a
            href="https://github.com/Dhallagan/HomeworkForLife"
            style={{ color: "#8E8982", fontSize: 14, textDecoration: "none" }}
          >
            GitHub
          </a>
        </nav>
        <p style={{ fontSize: 13, color: "#8E8982", margin: 0 }}>
          &copy; {new Date().getFullYear()} WalkLog
        </p>
      </footer>
    </>
  );
}

function Feature({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          backgroundColor: "#4F4A44",
          color: "#FFF8F2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 500,
          marginBottom: 16,
        }}
      >
        {number}
      </div>
      <h3
        style={{
          fontSize: 18,
          fontWeight: 500,
          margin: "0 0 8px",
          color: "#4F4A44",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.7,
          color: "#8E8982",
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}

function Detail({ title, text }: { title: string; text: string }) {
  return (
    <div
      style={{
        backgroundColor: "#FFFDFC",
        borderRadius: 14,
        padding: "20px 24px",
        border: "1px solid #DDD8CF",
      }}
    >
      <h3
        style={{
          fontSize: 16,
          fontWeight: 500,
          margin: "0 0 6px",
          color: "#4F4A44",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: "#8E8982",
          margin: 0,
        }}
      >
        {text}
      </p>
    </div>
  );
}
