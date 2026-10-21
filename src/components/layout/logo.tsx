import Image from "next/image";

import { cx } from "@/utils/cx";

/**
 * ИЛ ТОД МЭДЭЭ brand: the eye mark (PNG, transparent) + the wordmark as live text, so it stays
 * sharp at any size and follows dark mode (navy → white). Colors come from the logo artwork.
 */
export function Logo({ className, withDomain = false }: { className?: string; withDomain?: boolean }) {
  return (
    <span className={cx("flex items-center gap-2.5", className)}>
      <Image src="/brand/mark.png" alt="" width={240} height={149} priority className="h-8 w-auto" />
      <span className="flex flex-col leading-none">
        <span className="text-lg font-extrabold tracking-tight text-[#171043] uppercase dark:text-white">
          Ил&nbsp;тод <span className="text-[#05beb8]">мэдээ</span>
        </span>
        {withDomain && <span className="mt-1 text-[0.65rem] font-semibold tracking-[0.2em] text-tertiary uppercase">iltodmedee.mn</span>}
      </span>
    </span>
  );
}
