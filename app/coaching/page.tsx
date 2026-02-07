import Link from "next/link";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Coaching - Socratic Lesson",
  description: "Learn to think through anything. 1-on-1 coaching on solving the hardest problems in math, physics, and beyond — no shortcuts, just thinking. $199.",
  openGraph: {
    title: "Learn to think through anything",
    description: "1-on-1 problem solving coaching. From competition math to quantum physics — build the thinking skills to tackle any problem. $199 session.",
    url: "https://socraticlesson.com/coaching",
    siteName: "Socratic Lesson",
    images: [
      {
        url: "/coaching-og.png",
        width: 1024,
        height: 536,
        alt: "Socratic Lesson — Learn to think through anything. 1-on-1 problem solving coaching.",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Learn to think through anything",
    description: "1-on-1 coaching on solving the hardest problems — math, physics, and beyond. Live problem-solving streams since 2019. $199.",
    images: ["/coaching-og.png"],
    creator: "@uncertainsys",
  },
};

const VIDEOS = [
  {
    id: "BC7HCkjtOME",
    title: "Humanity's Last Exam (Part 1)",
    description: "Tackling the world's hardest exam live — real-time problem solving with no preparation.",
  },
  {
    id: "I5nBTsHNnlI",
    title: "Gaining Insight is like a brain orgasm",
    description: "On the thinking process, what insight feels like, and how to chase it deliberately.",
  },
  {
    id: "SlvrIxbqMqA",
    title: "Humanity's Last Exam (Part 2)",
    description: "Continuing to work through the world's hardest exam — live reasoning through advanced problems.",
  },
];

export default function CoachingPage() {
  return (
    <main className="min-h-screen flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-neutral-800/60 px-4 sm:px-6 py-4 backdrop-blur-sm bg-[#0a0a0a]/80 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-base sm:text-lg font-semibold text-white tracking-tight hover:text-neutral-300 transition-colors">
            Socratic Lesson
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/" className="text-xs sm:text-sm text-neutral-500 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/pricing" className="text-xs sm:text-sm text-neutral-500 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/dashboard" className="text-xs sm:text-sm text-neutral-500 hover:text-white transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            1-on-1 Coaching
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            Learn to think through anything
          </h1>
          <p className="text-neutral-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Personalized coaching on how to approach and solve any problem in front of you
            — even the hardest levels of mathematics and quantum physics.
            No shortcuts, no memorization. Just thinking.
          </p>
        </div>

        {/* Live Streams Since 2019 */}
        <div className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-1">Live problem solving since 2019</h2>
              <p className="text-sm text-neutral-500">
                Streaming real-time thinking sessions on the{" "}
                <a
                  href="https://www.youtube.com/@UncertainSystems"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-300 hover:text-white underline underline-offset-2 transition-colors"
                >
                  Uncertain Systems
                </a>
                {" "}YouTube channel — no scripts, no edits, just raw problem solving.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {VIDEOS.map((video) => (
              <div
                key={video.id}
                className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden"
              >
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${video.id}`}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-medium text-neutral-200 mb-1">{video.title}</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">{video.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-center">
            <a
              href="https://www.youtube.com/@UncertainSystems"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-neutral-500 hover:text-white transition-colors"
            >
              <YoutubeIcon />
              Watch all sessions on YouTube
              <span className="text-neutral-700">&rarr;</span>
            </a>
          </div>
        </div>

        {/* Coaching Offer */}
        <div className="max-w-xl mx-auto mb-14">
          <div className="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-6 sm:p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-amber-500 text-black text-[11px] font-medium rounded-full">
              Coaching
            </div>

            <div className="text-center mb-6">
              <div className="flex items-baseline justify-center gap-1.5 mb-2">
                <span className="text-4xl sm:text-5xl font-bold text-white">$199</span>
              </div>
              <p className="text-sm text-neutral-500">One-time session</p>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                "Personalized 1-on-1 video call",
                "Learn how to think — not what to think",
                "Tackle any problem: math, physics, CS, or anything else",
                "Build a systematic approach to hard problems",
                "Develop intuition for when you're stuck",
                "Strategies for the hardest levels — competition math, quantum mechanics, research problems",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-neutral-400">
                  <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <a
              href="https://x.com/uncertainsys"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 text-center text-sm font-medium text-black bg-white hover:bg-neutral-200 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <XIcon />
              Get in touch on X
            </a>
            <p className="text-[11px] text-neutral-700 text-center mt-3">
              Send a DM to @uncertainsys to book your session
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}

// ---- Icons ----

function YoutubeIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
