import React, { forwardRef } from 'react'
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary-500/10 text-primary-400 border border-primary-500/20",
        success: "bg-success-500/10 text-success-400 border border-success-500/20",
        danger: "bg-danger-500/10 text-danger-400 border border-danger-500/20",
        warning: "bg-warning-500/10 text-warning-400 border border-warning-500/20",
        info: "bg-info-500/10 text-info-400 border border-info-500/20",
        neutral: "bg-neutral-700/30 text-[#2C2C2C] border border-neutral-700/50",
        outline: "bg-transparent border border-black/20 text-[#2C2C2C]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  )
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }