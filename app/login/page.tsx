'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Already authenticated — go straight to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard')
    }
  }, [user, isLoading, router])

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true)
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
      router.replace('/dashboard')
    } catch (err: any) {
      console.error('Sign-in error:', err)
      setError(err.message || 'Sign-in failed. Please try again.')
    } finally {
      setIsSigningIn(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-card border-2 border-foreground rounded-2xl p-8 shadow-[8px_8px_0px_0px_var(--primary)] flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <img
              src="/logo_cherry.png"
              alt="Provenance"
              className="w-14 h-14 rounded-full object-cover"
            />
            <span className="font-magilio text-primary font-bold tracking-wider text-2xl">
              Provenance
            </span>
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              Graph-first decision tracking for fast-moving teams
            </p>
          </div>

          {/* Divider */}
          <div className="w-full border-t border-border/50" />

          {/* Sign-in button */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            size="lg"
            className="w-full h-12 font-semibold flex items-center gap-3"
          >
            {isSigningIn ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                {/* Google 'G' icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          {error && (
            <p className="text-xs text-destructive text-center bg-destructive/10 border border-destructive/30 rounded px-3 py-2 w-full">
              {error}
            </p>
          )}

          <p className="text-[11px] text-muted-foreground text-center">
            By signing in you agree to use this application with your real team data.
          </p>
        </div>
      </div>
    </div>
  )
}
