"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Home } from "lucide-react"
import Link from "next/link"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }

    router.push("/dashboard")
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
          <h1 className="font-display text-3xl font-semibold text-[#0F1B2D]">Set new password</h1>
          <p className="mt-2 text-sm text-slate-500">Enter a new password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Min 8 characters"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm Password</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              minLength={8}
              placeholder="Repeat your password"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f] font-semibold"
          >
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  )
}
