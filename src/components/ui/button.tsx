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
  "relative overflow-hidden inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 uppercase tracking-wider",
  {
    variants: {
      variant: {
        /**
         * **Filled Button (Default)**
         * Use for the most important actions.
         * It has a solid background color and provides a strong visual cue.
         */
        default: "bg-primary text-on-primary shadow-level-1 hover:shadow-level-2",
        /**
         * **Tonal Button**
         * A medium-emphasis button that's a lighter alternative to Filled buttons.
         * Use for secondary actions that still need some emphasis.
         */
        tonal: "bg-secondary-container text-on-secondary-container shadow-level-1 hover:shadow-level-2",
        /**
         * **Destructive Button**
         * A Filled button styled with error colors for actions that delete data or are otherwise destructive.
         */
        destructive:
          "bg-error text-on-error shadow-level-1 hover:shadow-level-2",
        /**
         * **Elevated Button**
         * A button with a shadow that appears to "float" above the surface.
         * Use for actions that need to stand out from a complex background.
         */
        elevated:
          "bg-surface-container-low text-primary shadow-level-1 hover:shadow-level-2",
        /**
         * **Outlined Button**
         * A medium-emphasis button with a border and no fill.
         * Use for important actions that aren't the primary call to action.
         */
        outline:
          "border border-outline text-primary hover:bg-primary/5",
        /**
         * **Secondary Filled Button**
         * A Filled button that uses the secondary color scheme.
         */
        secondary:
          "bg-secondary text-on-secondary shadow-level-1 hover:shadow-level-2",
        /**
         * **Ghost Button**
         * A low-emphasis button, similar to a Text button but can be used for less prominent actions.
         */
        ghost: "text-secondary hover:bg-secondary/10",
        /**
         * **Text Button**
         * The lowest-emphasis button, used for less important actions.
         * It's typically used in dialogs, cards, and other containers.
         */
        text: "text-primary hover:bg-primary/5",
        /**
         * **Link Button**
         * A button styled to look like a hyperlink.
         */
        link: "text-primary underline-offset-4 hover:underline",
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
        <>
          {children}
          <Ripple ref={rippleRef} />
        </>
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
