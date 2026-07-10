import type { Metadata } from "next"
import Link from "next/link"
import { LoginForm } from "./login-form"
import { Home } from "lucide-react"

export const metadata: Metadata = {
  title: "Sign In",
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden w-1/2 flex-col justify-between navy-gradient p-12 lg:flex">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-[#0E7C67]">
            <Home className="h-5 w-5 text-[#1A2320]" />
          </div>
          <span className="font-display text-xl font-semibold text-white">Carefree Casa</span>
        </Link>
        <div>
          <blockquote className="mb-8">
            <p className="font-display text-3xl font-light leading-relaxed text-white/90">
              "Our home has never been in better condition. Carefree Casa handles everything — we just enjoy it."
            </p>
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20" />
            <div>
              <p className="font-medium text-white">Robert Ashworth</p>
              <p className="text-sm text-white/60">Client since 2023 — Buckhead</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#F5F0E8] px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <Link href="/" className="mb-6 flex items-center justify-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#1A2320]">
                <Home className="h-4 w-4 text-[#0E7C67]" />
              </div>
              <span className="font-display text-lg font-semibold text-[#1A2320]">Carefree Casa</span>
            </Link>
            <h1 className="font-display text-3xl font-semibold text-[#1A2320]">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-500">Sign in to your Carefree Casa account</p>
          </div>

          <LoginForm />

          <p className="mt-6 text-center text-sm text-slate-500">
            New client?{" "}
            <Link href="/signup" className="font-medium text-[#0E7C67] hover:underline">
              Contact us to get started
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
