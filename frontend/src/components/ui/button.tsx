import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-primary disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-primary-500 text-dark-primary hover:bg-primary-600 focus-visible:ring-primary-500 shadow-sm hover:shadow-md",
        success: "bg-success-500 text-dark-primary hover:bg-success-600 focus-visible:ring-success-500 shadow-sm hover:shadow-md",
        danger: "bg-danger-500 text-white hover:bg-danger-600 focus-visible:ring-danger-500 shadow-sm hover:shadow-md",
        warning: "bg-warning-500 text-dark-primary hover:bg-warning-600 focus-visible:ring-warning-500 shadow-sm hover:shadow-md",
        outline: "border border-primary-500/50 text-primary-400 bg-transparent hover:bg-primary-500/10 hover:border-primary-500 focus-visible:ring-primary-500",
        ghost: "bg-transparent text-[#2C2C2C] hover:bg-white/5 hover:text-[#2C2C2C] focus-visible:ring-primary-500",
        glass: "bg-white/70 backdrop-blur-md border border-black/10 text-[#2C2C2C] hover:bg-white/90 hover:border-black/20 focus-visible:ring-primary-500",
        link: "text-primary-400 underline-offset-4 hover:underline hover:text-primary-300 focus-visible:ring-primary-500",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-md",
        default: "h-10 px-3 py-2.5 text-xs rounded-lg",
        lg: "h-12 px-3 text-xs rounded-lg",
        xl: "h-14 px-3 text-xs rounded-xl",
        icon: "h-10 w-10 rounded-lg",
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