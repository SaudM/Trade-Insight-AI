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
        default: "bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg active:shadow-sm focus:ring-blue-500",
        /**
         * **Tonal Button**
         * A medium-emphasis button that's a lighter alternative to Filled buttons.
         * Use for secondary actions that still need some emphasis.
         */
        tonal: "bg-blue-100 text-blue-700 shadow-sm hover:bg-blue-200 hover:shadow-md active:shadow-sm focus:ring-blue-400",
        /**
         * **Destructive Button**
         * A Filled button styled with error colors for actions that delete data or are otherwise destructive.
         */
        destructive:
          "bg-red-600 text-white shadow-md hover:bg-red-700 hover:shadow-lg active:shadow-sm focus:ring-red-500",
        /**
         * **Elevated Button**
         * A button with a shadow that appears to "float" above the surface.
         * Use for actions that need to stand out from a complex background.
         */
        elevated:
          "bg-white text-blue-600 shadow-lg hover:shadow-xl active:shadow-md border border-gray-100 focus:ring-blue-500",
        /**
         * **Outlined Button**
         * A medium-emphasis button with a border and no fill.
         * Use for important actions that aren't the primary call to action.
         */
        outline:
          "border border-blue-300 text-blue-600 hover:bg-blue-50 active:bg-blue-100 focus:ring-blue-400",
        /**
         * **Secondary Filled Button**
         * A Filled button that uses the secondary color scheme.
         */
        secondary:
          "bg-slate-600 text-white shadow-md hover:bg-slate-700 hover:shadow-lg active:shadow-sm focus:ring-slate-500",
        /**
         * **Ghost Button**
         * A low-emphasis button, similar to a Text button but can be used for less prominent actions.
         */
        ghost: "text-slate-600 hover:bg-slate-100 active:bg-slate-200 focus:ring-slate-400",
        /**
         * **Text Button**
         * The lowest-emphasis button, used for less important actions.
         * It's typically used in dialogs, cards, and other containers.
         */
        text: "text-blue-600 hover:bg-blue-50 active:bg-blue-100 focus:ring-blue-400",
        /**
         * **Link Button**
         * A button styled to look like a hyperlink.
         */
        link: "text-blue-600 underline-offset-4 hover:underline focus:ring-blue-400",
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
