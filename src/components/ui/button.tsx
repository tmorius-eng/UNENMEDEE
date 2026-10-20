/**
 * shadcn-compatible Button used inside vendored ElevenLabs UI components
 * (e.g. Conversation's scroll-to-bottom button), styled with Untitled UI tokens.
 * App code should prefer Untitled UI's <Button> from "@/components/base/buttons/button".
 */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-semibold whitespace-nowrap transition outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-brand-solid text-white shadow-xs hover:bg-brand-solid_hover",
        outline: "bg-primary text-secondary shadow-xs ring-1 ring-primary ring-inset hover:bg-primary_hover",
        secondary: "bg-secondary text-secondary hover:bg-secondary_hover",
        ghost: "text-tertiary hover:bg-primary_hover hover:text-secondary",
        link: "text-brand-secondary underline-offset-4 hover:underline",
        destructive: "bg-error-solid text-white hover:bg-error-solid_hover",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3",
        lg: "h-11 px-5",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({ className, variant, size, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return <button data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
