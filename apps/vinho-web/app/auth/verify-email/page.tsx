import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { AuthPageWrapper } from "@/components/auth/AuthPageWrapper";

export default function VerifyEmailPage() {
  return (
    <AuthPageWrapper title="Check your email" subtitle="Click the link we sent to verify your account.">
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <Mail style={{ width: "48px", height: "48px", color: "rgba(255,255,255,0.6)", margin: "0 auto" }} />
      </div>
      <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: "24px" }}>
        Check your spam folder if you don&apos;t see it.
      </p>
      <Link href="/auth/login">
        <Button style={{ width: "100%", background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.1)" }}>
          Back to sign in
        </Button>
      </Link>
      <Link href="/" style={{ display: "block", textAlign: "center", fontSize: "14px", color: "rgba(255,255,255,0.5)", marginTop: "16px" }}>
        Home
      </Link>
    </AuthPageWrapper>
  );
}
