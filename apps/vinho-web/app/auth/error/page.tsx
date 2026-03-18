import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { AuthPageWrapper } from "@/components/auth/AuthPageWrapper";

export default function AuthErrorPage() {
  return (
    <AuthPageWrapper title="Something went wrong" subtitle="The link may have expired. Try signing in again.">
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <AlertCircle style={{ width: "48px", height: "48px", color: "#f87171", margin: "0 auto" }} />
      </div>
      <Link href="/auth/login">
        <Button style={{ width: "100%", background: "white", color: "black", fontWeight: 600, marginBottom: "8px" }}>
          Sign in
        </Button>
      </Link>
      <Link href="/" style={{ display: "block", textAlign: "center", fontSize: "14px", color: "rgba(255,255,255,0.5)", marginTop: "16px" }}>
        Home
      </Link>
    </AuthPageWrapper>
  );
}
