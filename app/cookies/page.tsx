import Link from "next/link";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Cookie Policy - Socratic Lesson",
  description: "Cookie Policy for Socratic Lesson - How we use cookies on our website",
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <header className="border-b border-neutral-800/60 px-4 sm:px-6 py-4 backdrop-blur-sm bg-[#0a0a0a]/80 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-base sm:text-lg font-semibold text-white tracking-tight">Socratic Lesson</Link>
          <span className="text-[10px] text-neutral-600 font-medium uppercase tracking-widest">Cookie Policy</span>
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl font-bold text-white mb-2">Cookie Policy</h1>
        <p className="text-xs text-neutral-600 mb-8">Last updated: February 2026</p>

        <div className="space-y-8 text-sm text-neutral-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">1. What Are Cookies</h2>
            <p>
              Cookies are small text files that are placed on your computer or mobile device
              when you visit a website. They are widely used to make websites work more
              efficiently and to provide information to website owners.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">2. How We Use Cookies</h2>
            <p className="mb-3">Socratic Lesson uses cookies for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong className="text-neutral-300">Essential Cookies:</strong> Required for the website to function
                properly, including authentication and security.
              </li>
              <li>
                <strong className="text-neutral-300">Payment Cookies:</strong> Set by Stripe during checkout to
                process payments securely. Only present during the payment flow.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">3. Types of Cookies We Use</h2>

            <h3 className="text-sm font-medium text-neutral-300 mb-2">Essential Cookies</h3>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-xs border border-neutral-800 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-neutral-800/50">
                    <th className="text-left px-3 py-2 text-neutral-300 font-medium">Cookie</th>
                    <th className="text-left px-3 py-2 text-neutral-300 font-medium">Purpose</th>
                    <th className="text-left px-3 py-2 text-neutral-300 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  <tr>
                    <td className="px-3 py-2 font-mono text-neutral-500">sb-auth-token</td>
                    <td className="px-3 py-2">Authentication session (Supabase)</td>
                    <td className="px-3 py-2">Session</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-neutral-500">sb-refresh-token</td>
                    <td className="px-3 py-2">Session refresh</td>
                    <td className="px-3 py-2">7 days</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-medium text-neutral-300 mb-2">What We Don&apos;t Use</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>No analytics or tracking cookies</li>
              <li>No advertising cookies</li>
              <li>No third-party marketing cookies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">4. Third-Party Cookies</h2>
            <p className="mb-3">Some cookies are placed by third-party services that appear on our pages:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-neutral-300">Supabase:</strong> For authentication and user session management</li>
              <li><strong className="text-neutral-300">Stripe:</strong> For secure payment processing during checkout</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">5. Managing Cookies</h2>
            <p className="mb-3">
              Most browsers allow you to refuse or accept cookies, delete existing cookies,
              and set preferences for certain websites. Here&apos;s how to manage cookies in
              popular browsers:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Safari</a></li>
              <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Microsoft Edge</a></li>
            </ul>
            <p className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-amber-400/80 text-xs">
              <strong>Note:</strong> Disabling essential cookies will prevent you from logging in
              and using Socratic Lesson.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">6. Updates to This Policy</h2>
            <p>
              We may update this Cookie Policy from time to time. Any changes will be posted
              on this page with an updated revision date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-3">7. Contact Us</h2>
            <p className="mb-3">If you have questions about our use of cookies, please contact us at:</p>
            <div className="p-4 rounded-lg bg-neutral-900/50 border border-neutral-800 space-y-1">
              <p><strong className="text-neutral-300">Email:</strong> daniel@uncertain.systems</p>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
