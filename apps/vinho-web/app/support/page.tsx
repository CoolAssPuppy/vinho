import { Mail, Github, Book } from "lucide-react";
import Link from "next/link";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-vino-dark">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-vino-text mb-8">Support</h1>

        <div className="space-y-8 text-vino-text-secondary">
          <section className="bg-vino-dark-secondary p-6 rounded-lg border border-vino-border">
            <h2 className="text-2xl font-semibold text-vino-text mb-4">About Vinho</h2>
            <p className="mb-4">
              Vinho is a free, open-source wine tracking app built for fun and shared with the community.
              We created it because we love wine and wanted a simple way to remember what we've tasted.
            </p>
            <p>
              Since this is freeware, we don't offer formal customer support. However, we do our best to keep things running smoothly!
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-vino-text mb-4">Common Questions</h2>

            <div className="space-y-4">
              <div className="bg-vino-dark-secondary p-5 rounded-lg border border-vino-border">
                <h3 className="font-semibold text-vino-text mb-2">How do I import from Vivino?</h3>
                <p>
                  Go to your Profile, then the "Import from Vivino" tab. You'll need to export your Vivino data first from their website.
                </p>
              </div>

              <div className="bg-vino-dark-secondary p-5 rounded-lg border border-vino-border">
                <h3 className="font-semibold text-vino-text mb-2">Can I share my tastings with friends?</h3>
                <p>
                  Yes! Go to the Sharing tab to connect with other Vinho users and share your wine experiences.
                </p>
              </div>

              <div className="bg-vino-dark-secondary p-5 rounded-lg border border-vino-border">
                <h3 className="font-semibold text-vino-text mb-2">Is my data safe?</h3>
                <p>
                  Your data is stored securely and is private by default. Check out our{" "}
                  <Link href="/privacy" className="text-vino-accent hover:underline">
                    Privacy Policy
                  </Link>{" "}
                  for details.
                </p>
              </div>

              <div className="bg-vino-dark-secondary p-5 rounded-lg border border-vino-border">
                <h3 className="font-semibold text-vino-text mb-2">Can I delete my account?</h3>
                <p>
                  Yes, you can delete your account and all your data from the Privacy & Security tab in your profile.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-vino-text mb-4">Need Help?</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-vino-dark-secondary p-6 rounded-lg border border-vino-border">
                <Mail className="h-8 w-8 text-vino-accent mb-3" />
                <h3 className="font-semibold text-vino-text mb-2">Email Us</h3>
                <p className="mb-3">
                  For questions or feedback, send us an email. We'll respond when we can!
                </p>
                <a
                  href="mailto:support@vinho.app"
                  className="text-vino-accent hover:underline"
                >
                  support@vinho.app
                </a>
              </div>

              <div className="bg-vino-dark-secondary p-6 rounded-lg border border-vino-border">
                <Book className="h-8 w-8 text-vino-accent mb-3" />
                <h3 className="font-semibold text-vino-text mb-2">Documentation</h3>
                <p className="mb-3">
                  Check out our{" "}
                  <Link href="/terms" className="text-vino-accent hover:underline">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-vino-accent hover:underline">
                    Privacy Policy
                  </Link>{" "}
                  for more information.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-vino-dark-secondary p-6 rounded-lg border border-vino-border">
            <h2 className="text-2xl font-semibold text-vino-text mb-3">Remember</h2>
            <p>
              Vinho is a labor of love, made for the joy of tracking wines and sharing that experience.
              We appreciate your patience and understanding. Cheers! 🍷
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
