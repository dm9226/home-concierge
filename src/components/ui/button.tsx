import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#1A2320] text-white hover:bg-[#2A3833] focus-visible:ring-[#1A2320]",
        gold: "bg-[#0E7C67] text-white hover:bg-[#0A5F4E] focus-visible:ring-[#0E7C67] font-semibold",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
        outline:
          "border border-[#1A2320]/20 bg-transparent text-[#1A2320] hover:bg-[#1A2320]/5 focus-visible:ring-[#1A2320] dark:border-white/20 dark:text-white dark:hover:bg-white/5",
        ghost:
          "text-[#1A2320] hover:bg-[#1A2320]/5 focus-visible:ring-[#1A2320] dark:text-white dark:hover:bg-white/10",
        link: "text-[#0E7C67] underline-offset-4 hover:underline focus-visible:ring-[#0E7C67]",
        emergency:
          "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/30 font-semibold",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-full px-3 text-xs",
        lg: "h-12 rounded-full px-8 text-base",
        xl: "h-14 rounded-full px-10 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
