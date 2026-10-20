"use client";

import { useRouter } from "next/navigation";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { RouterProvider } from "react-aria-components";

declare module "react-aria-components" {
  interface RouterConfig {
    routerOptions: NonNullable<Parameters<ReturnType<typeof useRouter>["push"]>[1]>;
  }
}

/** Theme (Untitled UI uses `.dark-mode` / `.light-mode`) and client-side routing for React Aria links. */
export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <RouterProvider navigate={router.push}>
      <ThemeProvider attribute="class" value={{ light: "light-mode", dark: "dark-mode" }} defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </RouterProvider>
  );
}
