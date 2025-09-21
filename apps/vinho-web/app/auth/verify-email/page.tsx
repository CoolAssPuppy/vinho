import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Wine } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            Check your email
          </CardTitle>
          <CardDescription className="text-center">
            We've sent you a confirmation link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>
              We've sent a confirmation email to your inbox. Please click the
              link in the email to verify your account.
            </p>
            <p>If you don't see the email, check your spam folder.</p>
          </div>

          <div className="space-y-2">
            <Link href="/auth/login" className="block">
              <Button variant="outline" className="w-full">
                Back to Sign In
              </Button>
            </Link>
            <Link href="/" className="block">
              <Button variant="ghost" className="w-full">
                Return to Homepage
              </Button>
            </Link>
          </div>

          <div className="text-xs text-center text-muted-foreground pt-4 border-t">
            <p>Didn't receive the email?</p>
            <p>You can request a new one from the sign in page.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
