import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // UZZ.AI Custom Badges
        new:
          "border-transparent bg-gradient-to-r from-mint-500 to-gold-500 text-erie-black-900 font-bold uppercase tracking-wider",
        beta:
          "border-brand-blue-500 bg-brand-blue-500/20 text-brand-blue-700 font-bold uppercase tracking-wider",
        admin:
          "border-gold-500/30 bg-gold-500/15 text-gold-600 font-bold uppercase tracking-wider",
        dev:
          "border-silver-300 bg-silver-200/50 text-silver-600 font-bold uppercase tracking-wider",
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

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
