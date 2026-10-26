import Link from "next/link";

import { formatDateMn } from "@/lib/format";
import type { SourceDiff, SourceStatus } from "@/lib/scraper/recheck";

/**
 * What the weekly re-check found on the source page (src/lib/scraper/recheck.ts). Neutral on
 * purpose: a changed page can be a correction, so we show the sentences and let readers judge.
 * Server-only markup; `<details>` opens without JavaScript.
 */
export function SourceChangeNotice({ status, changedAt, diff }: { status: SourceStatus | null; changedAt: Date | null; diff: SourceDiff | null }) {
  if (!changedAt || (status !== "changed" && status !== "gone")) return null;
  if (status === "gone") {
    return (
      <p className="rounded-lg bg-signal-soft px-3 py-2 text-sm text-primary ring-1 ring-signal ring-inset">
        ⚠️ Эх хуудас {formatDateMn(changedAt)}-нд нээгдэхгүй болсон (дор хаяж 2 удаа, хэдэн өдрийн зайтай шалгасан). Бидний хадгалсан анхны текст доор байна.{" "}
        <Link href="/changes" className="font-semibold underline">
          Бүх өөрчлөлт
        </Link>
      </p>
    );
  }
  const edits = (diff?.pairs.length ?? 0) + (diff?.removed.length ?? 0);
  return (
    <details className="group rounded-lg bg-signal-soft px-3 py-2 text-sm text-primary ring-1 ring-signal ring-inset">
      <summary className="cursor-pointer list-none">
        ✏️ Эх хуудасны текст {formatDateMn(changedAt)}-нд бидний хадгалсан хувилбараас өөр болсон
        {diff ? ` (${Math.round(diff.containment * 100)}% нь хэвээр, ${edits} өгүүлбэр өөрчлөгдсөн эсвэл хасагдсан)` : ""}.{" "}
        <span className="font-semibold underline group-open:hidden">Харах</span>
      </summary>
      {diff && (
        <div className="mt-3 flex flex-col gap-3 text-secondary">
          {diff.pairs.map((p, i) => (
            <div key={i} className="grid gap-1 rounded-md bg-primary p-3 ring-1 ring-line ring-inset">
              <p>
                <span className="font-semibold text-error-primary">Өмнө: </span>
                {p.before}
              </p>
              <p>
                <span className="font-semibold text-success-primary">Одоо: </span>
                {p.after}
              </p>
            </div>
          ))}
          {diff.removed.length > 0 && (
            <div className="rounded-md bg-primary p-3 ring-1 ring-line ring-inset">
              <p className="font-semibold text-error-primary">Хуудаснаас хасагдсан:</p>
              <ul className="mt-1 list-disc pl-5">
                {diff.removed.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-tertiary">
            Өөрчлөлт нь алдаа засвар байж болно. Бидний хадгалсан анхны текст доор байна; SHA-256 хэш нь түүнийг нотолно.{" "}
            <Link href="/method#recheck" className="font-semibold underline">
              Хэрхэн шалгадаг вэ
            </Link>
          </p>
        </div>
      )}
    </details>
  );
}
