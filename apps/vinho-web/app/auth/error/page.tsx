import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            Authentication Error
          </CardTitle>
          <CardDescription className="text-center">
            Something went wrong with the authentication process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>
              The authentication link may have expired or already been used.
            </p>
            <p>
              Please try signing in again or request a new confirmation email.
            </p>
          </div>

          <div className="space-y-2">
            <Link href="/auth/login" className="block">
              <Button className="w-full bg-black hover:bg-black/90 text-white">
                Try Sign In Again
              </Button>
            </Link>
            <Link href="/auth/register" className="block">
              <Button variant="outline" className="w-full">
                Create New Account
              </Button>
            </Link>
            <Link href="/" className="block">
              <Button variant="ghost" className="w-full">
                Return to Homepage
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
