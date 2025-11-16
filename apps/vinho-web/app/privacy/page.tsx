export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-vino-dark">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-vino-text mb-8">Privacy Policy</h1>

        <div className="space-y-6 text-vino-text-secondary">
          <p className="text-sm text-vino-text-tertiary">Last updated: November 2025</p>

          <section>
            <h2 className="text-2xl font-semibold text-vino-text mb-3">What We Collect</h2>
            <p>
              We collect information you provide when you create an account (email, name) and use the app (wine tastings, notes, photos, ratings).
              We also collect basic usage data to improve the app.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-vino-text mb-3">How We Use Your Information</h2>
            <p>
              We use your information to provide the wine tracking service, show you your own data, and improve the app.
              We do not sell your personal information to anyone.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-vino-text mb-3">Data Storage</h2>
            <p>
              Your data is stored securely using Supabase. Your wine notes and photos are private by default.
              If you choose to share with specific users, only those users can see what you share.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-vino-text mb-3">Third-Party Services</h2>
            <p>
              We use Google Places for location autocomplete. When you search for a location, that request goes to Google.
              We also use authentication services to keep your account secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-vino-text mb-3">Your Rights</h2>
            <p>
              You can delete your account and all your data at any time from the profile settings.
              You can also export your data by contacting us. You own your wine notes and photos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-vino-text mb-3">Cookies</h2>
            <p>
              We use essential cookies to keep you logged in and remember your preferences.
              No tracking or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-vino-text mb-3">Changes to This Policy</h2>
            <p>
              We may update this policy occasionally. If we make significant changes, we'll notify you via email.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-vino-text mb-3">Contact</h2>
            <p>
              Questions about privacy? Contact us at support@vinho.app
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
