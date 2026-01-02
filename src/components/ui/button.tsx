"use client";

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import Ripple, { RippleRef } from "./ripple";

/**
 * A set of button variants based on Material Design 3.
 * This includes styles for different button types, sizes, and states.
 *
 * @see https://m3.material.io/components/buttons/overview
 */
const buttonVariants = cva(
  // Base styles for all buttons
  "relative overflow-hidden inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 uppercase tracking-wider transform hover:scale-[1.02] active:scale-[0.98]",
  {
    variants: {
      variant: {
        /**
         * **Filled Button (Default)**
         * Use for the most important actions.
         * It has a solid background color and provides a strong visual cue.
         */
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90 hover:shadow-lg active:shadow-sm focus:ring-ring",
        /**
         * **Tonal Button**
         * A medium-emphasis button that's a lighter alternative to Filled buttons.
         * Use for secondary actions that still need some emphasis.
         */
        tonal: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-md active:shadow-sm focus:ring-ring",
        /**
         * **Destructive Button**
         * A Filled button styled with error colors for actions that delete data or are otherwise destructive.
         */
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-lg active:shadow-sm focus:ring-destructive",
        /**
         * **Elevated Button**
         * A button with a shadow that appears to "float" above the surface.
         * Use for actions that need to stand out from a complex background.
         */
        elevated:
          "bg-background text-primary shadow-lg hover:shadow-xl active:shadow-md border border-input focus:ring-ring",
        /**
         * **Outlined Button**
         * A medium-emphasis button with a border and no fill.
         * Use for important actions that aren't the primary call to action.
         */
        outline:
          "border border-input bg-background text-primary hover:bg-accent hover:text-accent-foreground active:bg-accent/80 focus:ring-ring",
        /**
         * **Secondary Filled Button**
         * A Filled button that uses the secondary color scheme.
         */
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-lg active:shadow-sm focus:ring-ring",
        /**
         * **Ghost Button**
         * A low-emphasis button, similar to a Text button but can be used for less prominent actions.
         */
        ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/80 focus:ring-ring",
        /**
         * **Text Button**
         * The lowest-emphasis button, used for less important actions.
         * It's typically used in dialogs, cards, and other containers.
         */
        text: "text-primary hover:bg-primary/10 active:bg-primary/20 focus:ring-ring",
        /**
         * **Link Button**
         * A button styled to look like a hyperlink.
         */
        link: "text-primary underline-offset-4 hover:underline focus:ring-ring",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-9 rounded-full px-4",
        lg: "h-11 rounded-full px-8",
        icon: "h-10 w-10",
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

/**
 * A versatile button component with Material Design 3 styling.
 * It supports multiple variants, sizes, and includes a ripple effect on click.
 * The `asChild` prop allows it to wrap other components while inheriting button styles.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const rippleRef = React.useRef<RippleRef>(null);
    const Comp = asChild ? Slot : "button"

    const handleMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
      rippleRef.current?.addRipple(event);
      props.onMouseDown?.(event);
    };

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
        onMouseDown={handleMouseDown}
      >
        {asChild ? (
          children
        ) : (
          <>
            {children}
            <Ripple ref={rippleRef} />
          </>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
