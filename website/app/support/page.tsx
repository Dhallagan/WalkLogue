import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support - WalkLog",
};

export default function Support() {
  return (
    <main
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: "60px 24px",
      }}
    >
      <a href="/" style={{ color: "#8E8982", fontSize: 14, textDecoration: "none" }}>
        WalkLog
      </a>
      <h1
        style={{
          fontSize: 36,
          fontWeight: 300,
          letterSpacing: -1.5,
          marginTop: 16,
          marginBottom: 32,
        }}
      >
        Support
      </h1>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 12, color: "#4F4A44" }}>
          Get Help
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.7 }}>
          If you run into a bug, have a question, or want to request a
          feature, open an issue on GitHub:
        </p>
        <p style={{ marginTop: 16 }}>
          <a
            href="https://github.com/Dhallagan/HomeworkForLife/issues"
            style={{
              color: "#4F4A44",
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            github.com/Dhallagan/HomeworkForLife/issues
          </a>
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 12, color: "#4F4A44" }}>
          Common Questions
        </h2>
        <div style={{ fontSize: 16, lineHeight: 1.7 }}>
          <p>
            <strong>Where is my data stored?</strong>
            <br />
            Everything is stored locally on your iPhone. No cloud, no servers.
            Uninstalling the app deletes all data.
          </p>
          <p style={{ marginTop: 16 }}>
            <strong>How do I export my journal?</strong>
            <br />
            Go to Settings and tap Export Journal. You'll get a JSON file
            you can save to Files, AirDrop, or send anywhere.
          </p>
          <p style={{ marginTop: 16 }}>
            <strong>Why does it need microphone access?</strong>
            <br />
            WalkLog records your voice during walks and transcribes it into
            journal entries. The microphone is only active while you're
            recording a walk.
          </p>
          <p style={{ marginTop: 16 }}>
            <strong>Does it work without an internet connection?</strong>
            <br />
            Recording and journaling work offline. Transcription and AI
            features need an internet connection to reach OpenAI.
          </p>
        </div>
      </section>
    </main>
  );
}
