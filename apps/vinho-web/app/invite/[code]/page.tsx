"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/database.types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Wine, Loader2 } from "lucide-react"

interface InviteDetails {
  success: boolean
  error?: string
  connection_id?: string
  sharer?: {
    id: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  }
}

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter()
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadInvite() {
      try {
        // Await params
        const resolvedParams = await params
        setInviteCode(resolvedParams.code)

        // Check if user is already logged in
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session)

        // Get invite details
        const { data, error } = await supabase.rpc('get_invite_by_code', { code: resolvedParams.code })

        if (error) throw error

        const inviteData = data as unknown as InviteDetails
        setInvite(inviteData)

        // If user is logged in, auto-accept the invite
        if (session && inviteData.success) {
          await acceptInvite()
        }
      } catch (err) {
        console.error('Error loading invite:', err)
        setInvite({
          success: false,
          error: err instanceof Error ? err.message : 'Failed to load invitation'
        })
      } finally {
        setLoading(false)
      }
    }

    loadInvite()
  }, [params, supabase])

  async function acceptInvite() {
    if (!inviteCode) return

    setAccepting(true)
    try {
      const { data, error } = await supabase.functions.invoke('accept-invite', {
        body: { code: inviteCode }
      })

      if (error) throw error

      const result = data as { success: boolean; error?: string }

      if (result.success) {
        // Redirect to home/feed page after successful acceptance
        router.push('/journal?invite_accepted=true')
      } else {
        throw new Error(result.error || 'Failed to accept invitation')
      }
    } catch (err) {
      console.error('Error accepting invite:', err)
      alert(err instanceof Error ? err.message : 'Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  async function handleSignUp() {
    // Store invite code in localStorage for post-signup processing
    if (inviteCode) {
      localStorage.setItem('pending_invite_code', inviteCode)
    }
    router.push('/auth/signup')
  }

  async function handleSignIn() {
    // Store invite code in localStorage for post-signin processing
    if (inviteCode) {
      localStorage.setItem('pending_invite_code', inviteCode)
    }
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-950 via-black to-rose-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    )
  }

  if (!invite || !invite.success || !invite.sharer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-950 via-black to-rose-950 p-4">
        <Card className="w-full max-w-md border-violet-500/20 bg-black/40 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-center text-red-400">Invalid Invitation</CardTitle>
            <CardDescription className="text-center">
              {invite?.error || 'This invitation link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => router.push('/')} variant="outline">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { sharer } = invite
  const sharerName = [sharer.first_name, sharer.last_name].filter(Boolean).join(' ') || 'A Vinho user'
  const initials = [sharer.first_name?.[0], sharer.last_name?.[0]].filter(Boolean).join('').toUpperCase()

  if (isAuthenticated && accepting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-950 via-black to-rose-950">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-400 mb-4" />
          <p className="text-violet-200">Accepting invitation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-950 via-black to-rose-950 p-4">
      <Card className="w-full max-w-md border-violet-500/20 bg-black/40 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <Wine className="h-12 w-12 text-violet-400 mx-auto mb-4" />
          </div>
          <div className="flex justify-center">
            <Avatar className="h-20 w-20 border-2 border-violet-400">
              <AvatarImage src={sharer.avatar_url || undefined} alt={sharerName} />
              <AvatarFallback className="bg-gradient-to-br from-violet-600 to-rose-600 text-white text-xl">
                {initials || '👤'}
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-2xl text-white">Join Vinho!</CardTitle>
          <CardDescription className="text-violet-200">
            <strong className="text-violet-400">{sharerName}</strong> invited you to share wine tastings together
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-3 text-sm text-violet-100">
            <div className="flex items-start gap-3">
              <div className="text-xl">📝</div>
              <div>
                <strong>View Tastings:</strong> See detailed tasting notes and ratings from {sharerName}'s wine collection
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-xl">🗺️</div>
              <div>
                <strong>Explore Together:</strong> Discover wine regions and producers they've experienced
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-xl">⭐</div>
              <div>
                <strong>Get Inspired:</strong> Find new wines to try based on their recommendations
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <Button
              onClick={handleSignUp}
              className="w-full bg-gradient-to-r from-violet-600 to-rose-600 hover:from-violet-700 hover:to-rose-700"
              size="lg"
            >
              Sign Up to Join
            </Button>
            <Button
              onClick={handleSignIn}
              variant="outline"
              className="w-full border-violet-500/50 text-violet-300 hover:bg-violet-950/50"
              size="lg"
            >
              Already have an account? Sign In
            </Button>
          </div>

          <p className="text-center text-xs text-violet-300/60 pt-4">
            By signing up, you'll be automatically connected with {sharerName}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
