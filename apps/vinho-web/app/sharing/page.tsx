"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSharing } from "@/lib/hooks/use-sharing";
import { UserPlus, Users, CheckCircle2, XCircle, Trash2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SharingPage() {
  const {
    connections: _connections,
    preferences: _preferences,
    loading,
    error,
    sendInvitation,
    acceptInvitation,
    rejectInvitation,
    revokeSharing,
    toggleSharerVisibility,
    isSharerVisible,
    getPendingInvitationsReceived,
    getActiveSharesSent,
    getActiveSharesReceived,
  } = useSharing();

  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSendInvitation = async () => {
    if (!inviteEmail || !inviteEmail.includes("@")) return;

    setSending(true);
    const result = await sendInvitation(inviteEmail);

    if (result.success) {
      setAlertMessage({ type: "success", message: result.error || "Invitation sent successfully!" });
      setInviteEmail("");
    } else {
      setAlertMessage({ type: "error", message: result.error || "Failed to send invitation" });
    }

    setSending(false);
    setTimeout(() => setAlertMessage(null), 5000);
  };

  const pendingInvites = getPendingInvitationsReceived();
  const sharesSent = getActiveSharesSent();
  const sharesReceived = getActiveSharesReceived();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sharing</h1>
        <p className="text-muted-foreground">
          Share your wine journey with friends and family
        </p>
      </div>

      {/* Alert */}
      {alertMessage && (
        <Alert variant={alertMessage.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{alertMessage.message}</AlertDescription>
        </Alert>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Send Invitation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Someone
          </CardTitle>
          <CardDescription>
            Share your wine tasting notes with friends and family
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="friend@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendInvitation();
              }}
              disabled={sending}
            />
            <Button onClick={handleSendInvitation} disabled={sending || !inviteEmail.includes("@")}>
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Invitation"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations Received */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitations Received</CardTitle>
            <CardDescription>
              People who want to share their tastings with you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingInvites.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {connection.sharer_profile?.first_name} {connection.sharer_profile?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    wants to share their wine tastings with you
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      const result = await acceptInvitation(connection.id);
                      if (result.success) {
                        setAlertMessage({ type: "success", message: "Invitation accepted!" });
                      } else {
                        setAlertMessage({ type: "error", message: result.error || "Failed to accept" });
                      }
                      setTimeout(() => setAlertMessage(null), 5000);
                    }}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const result = await rejectInvitation(connection.id);
                      if (result.success) {
                        setAlertMessage({ type: "success", message: "Invitation declined" });
                      } else {
                        setAlertMessage({ type: "error", message: result.error || "Failed to decline" });
                      }
                      setTimeout(() => setAlertMessage(null), 5000);
                    }}
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Shares Sent */}
      {sharesSent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Sharing With
            </CardTitle>
            <CardDescription>
              People who can view your wine tasting notes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sharesSent.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {connection.viewer_profile?.first_name} {connection.viewer_profile?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Can view your tastings
                    {connection.accepted_at && ` • Since ${new Date(connection.accepted_at).toLocaleDateString()}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    const result = await revokeSharing(connection.id);
                    if (result.success) {
                      setAlertMessage({ type: "success", message: "Sharing revoked" });
                    } else {
                      setAlertMessage({ type: "error", message: result.error || "Failed to revoke" });
                    }
                    setTimeout(() => setAlertMessage(null), 5000);
                  }}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Revoke
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Shares Received */}
      {sharesReceived.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Viewing Tastings From
            </CardTitle>
            <CardDescription>
              Control which shared tastings appear in your journal and map
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sharesReceived.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">
                    {connection.sharer_profile?.first_name} {connection.sharer_profile?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Sharing their wine journey with you
                    {connection.accepted_at && ` • Since ${new Date(connection.accepted_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={isSharerVisible(connection.sharer_id) ? "default" : "outline"}>
                    {isSharerVisible(connection.sharer_id) ? "Visible" : "Hidden"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const currentlyVisible = isSharerVisible(connection.sharer_id);
                      const result = await toggleSharerVisibility(connection.sharer_id, !currentlyVisible);
                      if (result.success) {
                        setAlertMessage({
                          type: "success",
                          message: currentlyVisible ? "Hidden from your views" : "Now visible in your views",
                        });
                      } else {
                        setAlertMessage({ type: "error", message: result.error || "Failed to update" });
                      }
                      setTimeout(() => setAlertMessage(null), 3000);
                    }}
                  >
                    {isSharerVisible(connection.sharer_id) ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {pendingInvites.length === 0 && sharesSent.length === 0 && sharesReceived.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-12">
            <div className="text-center space-y-4">
              <Users className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No Connections Yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Invite friends and family to share your wine journey, or accept invitations from others.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
