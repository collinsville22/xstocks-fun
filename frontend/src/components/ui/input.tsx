import * as React from "react"

import { cn } from "../../lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'glass'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = 'default', ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full px-3 py-2.5 text-xs font-mono tabular-nums rounded-lg transition-all duration-200",
          "text-[#2C2C2C] placeholder-neutral-500",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-xs file:font-medium",
          variant === 'default' && "bg-white border border-black/10 focus:bg-white focus:border-primary-500/50",
          variant === 'glass' && "bg-white/50 backdrop-blur-sm border border-black/10 focus:bg-white focus:border-primary-500/50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }