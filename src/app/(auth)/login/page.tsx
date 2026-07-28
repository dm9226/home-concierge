import type { Metadata } from "next"
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
        <a href="https://carefree-casa.com">
          <Logo size="lg" onDark />
        </a>
        <div className="max-w-md">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#0E7C67]">
            Concierge Home Management
          </p>
          <p className="font-display text-4xl font-light leading-tight text-white">
            Homeownership without the headache.
          </p>
          <p className="mt-5 text-lg leading-relaxed text-white/70">
            We treat your home like it&apos;s our own. Quarterly walkthroughs, trusted vendors, and on-demand support.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#F5F0E8] px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <a href="https://carefree-casa.com" className="mb-6 flex justify-center lg:hidden">
              <Logo />
            </a>
            <h1 className="font-display text-3xl font-semibold text-[#1A2320]">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-500">Sign in to your Carefree Casa account</p>
          </div>

          <LoginForm />

          <p className="mt-6 text-center text-sm text-slate-500">
            New to Carefree Casa?{" "}
            <a href="https://carefree-casa.com" className="font-medium text-[#0E7C67] hover:underline">
              Visit carefree-casa.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
