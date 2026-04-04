import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - WalkLog",
};

export default function PrivacyPolicy() {
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
        Privacy Policy
      </h1>
      <p style={{ fontSize: 13, color: "#8E8982", marginBottom: 32 }}>
        Last updated: March 31, 2026
      </p>

      <Section title="What WalkLog Does">
        <p>
          WalkLog is a personal journaling app for iOS. You record voice
          entries during walks, and the app transcribes them into written
          journal entries. You can also write entries manually, track steps,
          and ask questions about your journal using AI.
        </p>
      </Section>

      <Section title="Data That Stays on Your Device">
        <ul>
          <li>All journal entries (text, titles, dates)</li>
          <li>Walk session data (duration, step counts)</li>
          <li>People mentioned in your entries</li>
          <li>App preferences (theme, step source)</li>
          <li>Your SQLite database</li>
        </ul>
        <p>
          This data is stored locally on your iPhone using SQLite and
          Expo SecureStore. It is never uploaded to our servers. We do not
          have access to your journal entries.
        </p>
      </Section>

      <Section title="Data Sent to Third Parties">
        <p>
          WalkLog uses OpenAI APIs for three features. When you use these
          features, data is sent to OpenAI:
        </p>
        <ul>
          <li>
            <strong>Voice transcription:</strong> When you end a walk, the
            audio recording is sent to OpenAI Whisper for transcription.
            The audio is processed and not stored by OpenAI per their API
            data usage policy.
          </li>
          <li>
            <strong>AI reflections and titles:</strong> Journal entry text
            is sent to OpenAI to generate titles, daily summaries, and
            weekly reflections.
          </li>
          <li>
            <strong>Ask Your Journal:</strong> When you ask your journal a
            question, your entry text is sent to OpenAI to generate an
            answer.
          </li>
        </ul>
        <p>
          OpenAI processes this data under their{" "}
          <a
            href="https://openai.com/policies/api-data-usage-policies"
            style={{ color: "#4F4A44" }}
          >
            API data usage policy
          </a>
          , which states that API inputs and outputs are not used to train
          their models.
        </p>
      </Section>

      <Section title="Apple Health">
        <p>
          If you grant permission, WalkLog reads your step count from Apple
          Health to display on the home screen and attach to walk entries.
          Step data is read only. WalkLog does not write to Apple Health
          except for step-related journal metadata.
        </p>
      </Section>

      <Section title="Fitbit">
        <p>
          If you connect your Fitbit account, WalkLog reads your daily step
          count via the Fitbit Web API using OAuth 2.0 with PKCE. Your
          Fitbit access token is stored locally in Expo SecureStore. We do
          not store your Fitbit credentials on any server.
        </p>
      </Section>

      <Section title="No Accounts, No Tracking">
        <ul>
          <li>WalkLog does not require an account or login</li>
          <li>WalkLog does not use analytics or tracking SDKs</li>
          <li>WalkLog does not collect device identifiers</li>
          <li>WalkLog does not show ads</li>
          <li>WalkLog does not sell or share personal data</li>
        </ul>
      </Section>

      <Section title="Data Export and Deletion">
        <p>
          You can export all your journal data as JSON from Settings.
          To delete all data, uninstall the app. Since all data is stored
          on your device, uninstalling removes everything.
        </p>
      </Section>

      <Section title="Children">
        <p>
          WalkLog is not directed at children under 13. We do not knowingly
          collect data from children.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update this policy. Changes will be posted on this page
          with an updated date.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this privacy policy? Open an issue on{" "}
          <a
            href="https://github.com/Dhallagan/HomeworkForLife/issues"
            style={{ color: "#4F4A44" }}
          >
            GitHub
          </a>
          .
        </p>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 500,
          marginBottom: 12,
          color: "#4F4A44",
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: 16, lineHeight: 1.7 }}>{children}</div>
    </section>
  );
}
