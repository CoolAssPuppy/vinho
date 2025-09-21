import { MessageCircle, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function HelpCenterTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Help & Support</CardTitle>
          <CardDescription className="text-base">
            Get help with Vinho
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full justify-between text-base py-2.5"
          >
            <div className="flex items-center">
              <MessageCircle className="mr-2 h-5 w-5" />
              FAQs
            </div>
            <ExternalLink className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            className="w-full justify-between text-base py-2.5"
          >
            <div className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              User Guide
            </div>
            <ExternalLink className="h-5 w-5" />
          </Button>
          <Separator />
          <div className="text-center space-y-2">
            <p className="text-base text-muted-foreground">Need more help?</p>
            <Button className="text-base px-6 py-2">Contact Support</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
