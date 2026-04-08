import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WalkLogue - Journal Your Walks",
  description:
    "Record your voice while you walk. WalkLogue transcribes your thoughts into journal entries, tracks your steps, and lets you search your memories with AI.",
  openGraph: {
    title: "WalkLogue",
    description: "Journal your walks. Remember your days.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          margin: 0,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          backgroundColor: "#FDFCF9",
          color: "#595550",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {children}
      </body>
    </html>
  );
}
