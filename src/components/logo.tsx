import { Home } from "lucide-react"
import { cn } from "@/lib/utils"

// Carefree Casa mark: teal rounded square with a white house, plus the wordmark.
// Matches the company website. Use across nav, auth, and anywhere the brand shows.
export function Logo({
  className, wordmark = true, size = "md", onDark = false,
}: {
  className?: string
  wordmark?: boolean
  size?: "sm" | "md" | "lg"
  onDark?: boolean
}) {
  const box = size === "lg" ? "h-11 w-11 rounded-2xl" : size === "sm" ? "h-7 w-7 rounded-lg" : "h-9 w-9 rounded-xl"
  const icon = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-4 w-4" : "h-5 w-5"
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg"
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className={cn("flex items-center justify-center bg-[#0E7C67]", box)}>
        <Home className={cn("text-white", icon)} />
      </div>
      {wordmark && (
        <span className={cn("font-display font-semibold", text, onDark ? "text-white" : "text-[#1A2320] dark:text-white")}>
          Carefree Casa
        </span>
      )}
    </div>
  )
}
