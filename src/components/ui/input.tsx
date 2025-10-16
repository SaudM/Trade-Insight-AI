import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex h-12 w-full px-4 py-2 text-base text-on-surface ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-on-surface-variant focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        filled: "rounded-t-lg border-b-2 border-on-surface-variant bg-surface-container-highest focus-visible:ring-0 focus-visible:border-primary",
        outlined: "rounded-lg border border-outline bg-transparent focus-visible:ring-0 focus-visible:border-primary focus-visible:border-2",
      },
    },
    defaultVariants: {
      variant: "filled",
    },
  }
);

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>, VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
