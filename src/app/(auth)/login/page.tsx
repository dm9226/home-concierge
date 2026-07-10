import type { Metadata } from "next"
import Link from "next/link"
import { LoginForm } from "./login-form"
import { Logo } from "@/components/logo"

export const metadata: Metadata = {
  title: "Sign In",
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden w-1/2 flex-col justify-between navy-gradient p-12 lg:flex">
        <Link href="/">
          <Logo size="lg" onDark />
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
            <Link href="/" className="mb-6 flex justify-center lg:hidden">
              <Logo />
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
