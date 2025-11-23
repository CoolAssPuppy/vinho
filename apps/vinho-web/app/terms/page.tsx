export default function TermsPage() {
  return (
    <div className="min-h-screen bg-vino-dark">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-vino-text mb-8">Terms and Conditions</h1>

        <div className="space-y-6 text-vino-text-secondary">
          <p className="text-sm text-vino-text-tertiary">Last updated: November 2025</p>

          <section>
            <h2 className="text-2xl font-semibold text-vino-text mb-3">Acceptance of Terms</h2>
            <p>
              By using Vinho, you agree to these terms. If you do not agree, please do not use the app.
              These terms apply to the web app and iOS app.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-vino-text mb-3">What Vinho Is</h2>
            <p>
              Vinho is a free app for tracking your wine tastings. It is provided as-is for your personal use and enjoyment.
              We built this for fun, and we hope you find it useful.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-vino-text mb-3">Your Account</h2>
            <p>
              You are responsible for keeping your account secure. Do not share your password.
              You must be at least 21 years old (or the legal drinking age in your location) to use this app.
              One account per person, please.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-vino-text mb-3">Your Content</h2>
            <p>
              You own the tasting notes and photos you create. By using Vinho, you give us permission to store and display your content back to you (and people you choose to share with).
              Do not upload anything illegal or inappropriate.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-vino-text mb-3">Acceptable Use</h2>
            <p>
              Use Vinho for tracking your wine experiences. Do not try to hack it, spam it, or use it for anything illegal.
              Do not scrape our data or try to reverse engineer the app.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-vino-text mb-3">No Warranties</h2>
            <p>
              Vinho is provided as-is without any warranties. We cannot guarantee it will always work perfectly or be available 24/7.
              This is a free app made for fun, not a mission-critical service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-vino-text mb-3">Limitation of Liability</h2>
            <p>
              We are not liable for any damages from using (or not being able to use) Vinho.
              We are not responsible if your wine recommendations do not work out. You are responsible for your own wine choices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-vino-text mb-3">Changes and Termination</h2>
            <p>
              We can modify or shut down Vinho at any time. We will try to give you notice, but this is freeware.
              We can terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-vino-text mb-3">Disputes</h2>
            <p>
              These terms are governed by the laws of the United States. Any disputes will be handled in accordance with those laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-vino-text mb-3">Contact</h2>
            <p>
              Questions about these terms? Contact us at support@vinho.app
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
