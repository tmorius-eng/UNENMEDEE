"use client";

import { Menu02, XClose } from "@untitledui/icons";
import { AnimatePresence, motion } from "motion/react";
import { Suspense, useState } from "react";

import { NavLinks, NavLinksFallback } from "./nav-links";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Цэс хаах" : "Цэс нээх"}
        onClick={() => setOpen((v) => !v)}
        className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-fg-secondary hover:bg-primary_hover"
      >
        {open ? <XClose className="size-5" /> : <Menu02 className="size-5" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-0 top-full border-b border-secondary bg-primary/95 px-4 py-3 shadow-lg backdrop-blur-xl"
          >
            <Suspense fallback={<NavLinksFallback className="flex flex-col gap-1" onNavigate={() => setOpen(false)} />}>
              <NavLinks className="flex flex-col gap-1" onNavigate={() => setOpen(false)} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
