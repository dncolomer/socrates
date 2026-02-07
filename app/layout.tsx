import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Socratic Lesson",
  description: "Think out loud. AI-powered Socratic tutoring that listens to you reason and asks the right questions at the right time.",
  metadataBase: new URL("https://socraticlesson.com"),
  openGraph: {
    title: "Socratic Lesson — Think Out Loud",
    description: "An AI tutor that listens to you think out loud and asks Socratic questions when it spots gaps in your reasoning. Free and open source.",
    url: "https://socraticlesson.com",
    siteName: "Socratic Lesson",
    images: [
      {
        url: "/og-default.png",
        width: 1024,
        height: 536,
        alt: "Socratic Lesson — Think Out Loud. AI-powered Socratic tutoring for problem solving.",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Socratic Lesson — Think Out Loud",
    description: "An AI tutor that listens to you think out loud and asks Socratic questions when it spots gaps in your reasoning.",
    images: ["/og-default.png"],
    creator: "@uncertainsys",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
