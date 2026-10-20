"use client";

/**
 * Minimal Avatar primitives with the shadcn API (Avatar / AvatarImage / AvatarFallback)
 * that ElevenLabs UI's <MessageAvatar> expects, styled with Untitled UI tokens.
 * Replaces the Radix-based shadcn version to avoid an extra dependency.
 */
import * as React from "react";

import { cn } from "@/lib/utils";

const AvatarContext = React.createContext<{ loaded: boolean; setLoaded: (v: boolean) => void }>({ loaded: false, setLoaded: () => {} });

export function Avatar({ className, size = "default", ...props }: React.ComponentProps<"span"> & { size?: "default" | "sm" | "lg" }) {
  const [loaded, setLoaded] = React.useState(false);
  return (
    <AvatarContext.Provider value={{ loaded, setLoaded }}>
      <span
        data-slot="avatar"
        data-size={size}
        className={cn(
          "relative flex size-8 shrink-0 overflow-hidden rounded-full bg-secondary select-none data-[size=lg]:size-10 data-[size=sm]:size-6",
          className,
        )}
        {...props}
      />
    </AvatarContext.Provider>
  );
}

export function AvatarImage({ className, src, alt = "", ...props }: React.ComponentProps<"img">) {
  const { loaded, setLoaded } = React.useContext(AvatarContext);
  const ref = React.useRef<HTMLImageElement>(null);
  // A server-rendered <img> can finish loading before React attaches onLoad.
  React.useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, [src, setLoaded]);
  if (!src) return null;
  return (
    <img
      ref={ref}
      data-slot="avatar-image"
      src={src}
      alt={alt}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(false)}
      className={cn("aspect-square size-full object-cover", !loaded && "invisible absolute", className)}
      {...props}
    />
  );
}

export function AvatarFallback({ className, ...props }: React.ComponentProps<"span">) {
  const { loaded } = React.useContext(AvatarContext);
  if (loaded) return null;
  return (
    <span
      data-slot="avatar-fallback"
      className={cn("flex size-full items-center justify-center rounded-full bg-tertiary text-xs font-semibold text-secondary", className)}
      {...props}
    />
  );
}
