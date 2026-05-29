"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Home } from "lucide-react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?type=recovery`,
    })

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F0E8] px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-6 inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#0F1B2D]">
              <Home className="h-4 w-4 text-[#C9A96E]" />
            </div>
            <span className="font-display text-lg font-semibold text-[#0F1B2D]">Carefree Casa</span>
          </Link>
          <h1 className="font-display text-3xl font-semibold text-[#0F1B2D]">Reset password</h1>
          <p className="mt-2 text-sm text-slate-500">
            Enter your email and we'll send a reset link
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
            <p className="font-medium text-emerald-800">Check your email</p>
            <p className="mt-1 text-sm text-emerald-700">
              We sent a password reset link to <strong>{email}</strong>
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm text-[#C9A96E] hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="bg-white"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f] font-semibold"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
            <p className="text-center text-sm text-slate-500">
              <Link href="/login" className="text-[#C9A96E] hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
