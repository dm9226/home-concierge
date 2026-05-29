"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function SessionRefresher() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        // App came back to foreground -- refresh session using stored refresh token
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session) {
          router.push("/login")
        } else {
          // Re-run server components so middleware sees the fresh token
          router.refresh()
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [router])

  return null
}
