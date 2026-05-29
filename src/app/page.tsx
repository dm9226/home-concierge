import Link from "next/link"
import {
  Home, Shield, Wrench, Calendar, BarChart3,
  CheckCircle, Star, ArrowRight, Phone, Mail, MapPin
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-[#0F1B2D]">
              <Home className="h-5 w-5 text-[#C9A96E]" />
            </div>
            <span className="font-display text-xl font-semibold text-[#0F1B2D]">Carefree Casa</span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm text-slate-600 hover:text-[#0F1B2D] transition-colors">
              How It Works
            </a>
            <a href="#services" className="text-sm text-slate-600 hover:text-[#0F1B2D] transition-colors">
              Services
            </a>
            <a href="#testimonials" className="text-sm text-slate-600 hover:text-[#0F1B2D] transition-colors">
              Testimonials
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f]">
              <a href="#contact">Schedule Consultation</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden navy-gradient pt-16">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, #C9A96E 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }} />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#C9A96E]/30 bg-[#C9A96E]/10 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[#C9A96E]" />
            <span className="text-sm font-medium text-[#C9A96E]">Now accepting new clients in Metro Atlanta</span>
          </div>
          <h1 className="font-display text-5xl font-light leading-tight text-white md:text-7xl">
            Your Home,
            <br />
            <span className="text-[#C9A96E]">Perfectly Maintained</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            Carefree Casa is the premium home management service for Atlanta's most discerning homeowners.
            We handle every detail — from routine maintenance to emergency response — so you can
            simply enjoy your home.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="xl"
              className="bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f] font-semibold w-full sm:w-auto"
            >
              <a href="#contact">
                Schedule Your Consultation
                <ArrowRight className="h-5 w-5" />
              </a>
            </Button>
            <Button
              asChild
              size="xl"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 w-full sm:w-auto"
            >
              <Link href="/login">Client Login</Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-white/40">
            Serving Buckhead &bull; Brookhaven &bull; Sandy Springs &bull; Dunwoody &bull; Druid Hills &bull; Virginia-Highland
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-slate-200 bg-[#F5F0E8]">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { value: "200+", label: "Homes Managed" },
              { value: "15 min", label: "Emergency Response" },
              { value: "98%", label: "Client Satisfaction" },
              { value: "24/7", label: "Always Available" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-display text-3xl font-semibold text-[#0F1B2D]">{stat.value}</p>
                <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-16 text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-[#C9A96E]">The Process</p>
            <h2 className="mt-3 font-display text-4xl font-semibold text-[#0F1B2D]">
              How Carefree Casa Works
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Private Consultation",
                description:
                  "We meet at your home to understand your needs, assess your systems, and define the scope of your membership.",
              },
              {
                step: "02",
                title: "Complete Onboarding",
                description:
                  "Our concierge documents every system, appliance, warranty, and vendor contact in your digital home profile.",
              },
              {
                step: "03",
                title: "Ongoing Management",
                description:
                  "We proactively schedule maintenance, coordinate vendors, respond to issues, and keep you informed at every step.",
              },
              {
                step: "04",
                title: "Total Peace of Mind",
                description:
                  "Your home is protected, maintained, and improving in value — without you lifting a finger.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="mb-4 font-display text-5xl font-light text-[#C9A96E]/30">
                  {item.step}
                </div>
                <h3 className="mb-2 font-display text-xl font-semibold text-[#0F1B2D]">{item.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="bg-[#F5F0E8] py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-16 text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-[#C9A96E]">What We Do</p>
            <h2 className="mt-3 font-display text-4xl font-semibold text-[#0F1B2D]">
              Complete Home Care
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Wrench,
                title: "Vendor Coordination",
                description:
                  "Our vetted network of Atlanta's best contractors. We schedule, supervise, and verify all work.",
              },
              {
                icon: Calendar,
                title: "Preventive Maintenance",
                description:
                  "Seasonal checklists and proactive scheduling keep small issues from becoming expensive problems.",
              },
              {
                icon: Shield,
                title: "Emergency Response",
                description:
                  "15-minute response guarantee. We dispatch trusted vendors and keep you updated in real time.",
              },
              {
                icon: Home,
                title: "Home Inventory",
                description:
                  "Complete digital record of every system, appliance, warranty, and manual in your home.",
              },
              {
                icon: BarChart3,
                title: "Project Oversight",
                description:
                  "Major renovations managed from concept to completion, on budget and on schedule.",
              },
              {
                icon: CheckCircle,
                title: "Seasonal Preparation",
                description:
                  "Atlanta-specific checklists for spring, summer, fall, and winter keep your home ahead of the weather.",
              },
            ].map((service) => (
              <Card key={service.title} className="border-slate-200/60 bg-white">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#0F1B2D]">
                    <service.icon className="h-5 w-5 text-[#C9A96E]" />
                  </div>
                  <h3 className="mb-2 font-display text-lg font-semibold text-[#0F1B2D]">
                    {service.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-500">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-16 text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-[#C9A96E]">Client Stories</p>
            <h2 className="mt-3 font-display text-4xl font-semibold text-[#0F1B2D]">
              What Our Members Say
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                quote:
                  "Carefree Casa has completely transformed how I think about homeownership. I used to dread the maintenance list. Now it's simply handled.",
                author: "Robert A.",
                location: "Buckhead",
                stars: 5,
              },
              {
                quote:
                  "When we had a pipe burst at midnight on a Friday, my concierge had a plumber on site within 20 minutes. I didn't even have to think.",
                author: "Patricia V.",
                location: "Peachtree Battle",
                stars: 5,
              },
              {
                quote:
                  "The digital home profile alone is worth it. Every appliance, warranty, and manual at my fingertips. They thought of everything.",
                author: "William H.",
                location: "Brookhaven",
                stars: 5,
              },
            ].map((testimonial) => (
              <Card key={testimonial.author} className="bg-[#F5F0E8] border-slate-200/60">
                <CardContent className="pt-6">
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: testimonial.stars }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-[#C9A96E] text-[#C9A96E]" />
                    ))}
                  </div>
                  <p className="font-display text-[1.05rem] italic leading-relaxed text-[#0F1B2D]">
                    "{testimonial.quote}"
                  </p>
                  <div className="mt-4">
                    <p className="font-semibold text-[#0F1B2D]">{testimonial.author}</p>
                    <p className="text-sm text-slate-500">{testimonial.location}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Value Proposition Banner */}
      <section className="navy-gradient py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-5xl font-light text-white">
            Your Home, <span className="text-[#C9A96E]">Handled.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/70">
            Membership begins at $1,500/month. Custom plans available for larger estates.
            Limited availability in select Atlanta neighborhoods.
          </p>
          <Button
            asChild
            size="xl"
            className="mt-10 bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f] font-semibold"
          >
            <a href="#contact">
              Schedule Your Private Consultation
              <ArrowRight className="h-5 w-5" />
            </a>
          </Button>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-[#F5F0E8] py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-[#C9A96E]">Get Started</p>
          <h2 className="mt-3 font-display text-4xl font-semibold text-[#0F1B2D]">
            Schedule Your Consultation
          </h2>
          <p className="mt-4 text-slate-500">
            Tell us about your home and we'll follow up within one business day to arrange a
            private in-home consultation at your convenience.
          </p>
          <div className="mt-8 rounded-xl border border-slate-200/80 bg-white p-8 text-left shadow-sm">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">First Name</label>
                  <input
                    type="text"
                    className="w-full rounded-sm border border-slate-200 px-3 py-2 text-sm focus:border-[#0F1B2D]/40 focus:outline-none focus:ring-2 focus:ring-[#0F1B2D]/20"
                    placeholder="Elizabeth"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Last Name</label>
                  <input
                    type="text"
                    className="w-full rounded-sm border border-slate-200 px-3 py-2 text-sm focus:border-[#0F1B2D]/40 focus:outline-none focus:ring-2 focus:ring-[#0F1B2D]/20"
                    placeholder="Hartley"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  className="w-full rounded-sm border border-slate-200 px-3 py-2 text-sm focus:border-[#0F1B2D]/40 focus:outline-none focus:ring-2 focus:ring-[#0F1B2D]/20"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
                <input
                  type="tel"
                  className="w-full rounded-sm border border-slate-200 px-3 py-2 text-sm focus:border-[#0F1B2D]/40 focus:outline-none focus:ring-2 focus:ring-[#0F1B2D]/20"
                  placeholder="(404) 555-0100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Neighborhood / Zip Code
                </label>
                <input
                  type="text"
                  className="w-full rounded-sm border border-slate-200 px-3 py-2 text-sm focus:border-[#0F1B2D]/40 focus:outline-none focus:ring-2 focus:ring-[#0F1B2D]/20"
                  placeholder="Buckhead, 30342"
                />
              </div>
              <Button className="w-full bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f] font-semibold" size="lg">
                Request a Consultation
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#0F1B2D]">
                <Home className="h-4 w-4 text-[#C9A96E]" />
              </div>
              <span className="font-display text-lg font-semibold text-[#0F1B2D]">Carefree Casa</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="tel:4045550100" className="flex items-center gap-1.5 hover:text-[#0F1B2D] transition-colors">
                <Phone className="h-3.5 w-3.5" />
                (404) 555-0100
              </a>
              <a href="mailto:hello@carefreecasa.com" className="flex items-center gap-1.5 hover:text-[#0F1B2D] transition-colors">
                <Mail className="h-3.5 w-3.5" />
                hello@carefreecasa.com
              </a>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Atlanta, GA
              </span>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-slate-100 pt-6 text-xs text-slate-400 sm:flex-row">
            <p>2025 Carefree Casa. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-slate-600">Privacy Policy</a>
              <a href="#" className="hover:text-slate-600">Terms of Service</a>
              <Link href="/login" className="hover:text-slate-600">Client Portal</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
