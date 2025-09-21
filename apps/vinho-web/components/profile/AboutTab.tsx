import { FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AboutTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">About Vinho</CardTitle>
          <CardDescription className="text-base">
            Your personal wine companion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-base">Version</h4>
            <p className="text-base text-muted-foreground">1.0.0 (Build 100)</p>
          </div>
          <Separator />
          <div className="space-y-2">
            <h4 className="font-semibold text-base">Our Mission</h4>
            <p className="text-base text-muted-foreground">
              Vinho helps wine enthusiasts discover, track, and share their wine
              experiences with a beautiful, intuitive interface designed for
              both beginners and connoisseurs.
            </p>
          </div>
          <Separator />
          <div className="space-y-2">
            <Button variant="outline" className="w-full text-base py-2.5">
              <FileText className="mr-2 h-5 w-5" />
              Terms of Service
            </Button>
            <Button variant="outline" className="w-full text-base py-2.5">
              <Shield className="mr-2 h-5 w-5" />
              Privacy Policy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
