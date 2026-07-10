"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Tables } from "@/types/database"

export function ProfileSettingsForm({ user }: { user: Tables<"users"> }) {
  const router = useRouter()
  const [form, setForm] = useState({
    full_name: user.full_name ?? "",
    phone: user.phone ?? "",
  })
  const [password, setPassword] = useState({ current: "", next: "", confirm: "" })
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setProfileLoading(true)
    setProfileMsg(null)

    const supabase = createClient()
    const { error } = await supabase
      .from("users")
      .update({ full_name: form.full_name, phone: form.phone || null })
      .eq("id", user.id)

    setProfileLoading(false)
    if (error) {
      setProfileMsg({ type: "error", text: error.message })
    } else {
      setProfileMsg({ type: "success", text: "Profile updated." })
      router.refresh()
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.next !== password.confirm) {
      setPasswordMsg({ type: "error", text: "New passwords do not match." })
      return
    }
    setPasswordLoading(true)
    setPasswordMsg(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: password.next })

    setPasswordLoading(false)
    if (error) {
      setPasswordMsg({ type: "error", text: error.message })
    } else {
      setPasswordMsg({ type: "success", text: "Password updated." })
      setPassword({ current: "", next: "", confirm: "" })
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled className="bg-slate-50 text-slate-400" />
              <p className="text-xs text-slate-400">Email cannot be changed here. Contact support.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(404) 555-0100"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            {profileMsg && (
              <p className={`text-sm ${profileMsg.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
                {profileMsg.text}
              </p>
            )}
            <Button
              type="submit"
              disabled={profileLoading}
              className="bg-[#0E7C67] text-white hover:bg-[#0A5F4E]"
            >
              {profileLoading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new_password">New Password</Label>
              <Input
                id="new_password"
                type="password"
                placeholder="Min 8 characters"
                value={password.next}
                onChange={e => setPassword(p => ({ ...p, next: e.target.value }))}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm_password">Confirm New Password</Label>
              <Input
                id="confirm_password"
                type="password"
                placeholder="Repeat new password"
                value={password.confirm}
                onChange={e => setPassword(p => ({ ...p, confirm: e.target.value }))}
                required
                minLength={8}
              />
            </div>
            {passwordMsg && (
              <p className={`text-sm ${passwordMsg.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
                {passwordMsg.text}
              </p>
            )}
            <Button
              type="submit"
              disabled={passwordLoading}
              className="bg-[#0E7C67] text-white hover:bg-[#0A5F4E]"
            >
              {passwordLoading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
