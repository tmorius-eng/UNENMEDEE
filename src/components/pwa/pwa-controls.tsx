"use client";

import { Bell01, BellRinging01, Download01, PlusSquare, Share01, XClose } from "@untitledui/icons";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { cx } from "@/utils/cx";

import { HEADER_ICON_BUTTON } from "@/components/layout/header-styles";

import { usePwa } from "./use-pwa";

const DISMISS_KEY = "iltod-install-dismissed-at";
const DISMISS_DAYS = 14;

function readDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

function IosSteps() {
  return (
    <ol className="flex flex-col gap-2 text-sm text-secondary">
      <li className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-solid text-xs font-semibold text-primary_on-brand">1</span>
        Safari-ийн доод хэсгийн <Share01 className="inline size-4 text-brand-secondary" aria-label="Share" /> товчийг дарна
      </li>
      <li className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-solid text-xs font-semibold text-primary_on-brand">2</span>
        <span>
          <PlusSquare className="inline size-4 text-brand-secondary" aria-hidden /> <b>Add to Home Screen</b> (Нүүр дэлгэцэнд нэмэх)
        </span>
      </li>
      <li className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-solid text-xs font-semibold text-primary_on-brand">3</span>
        Аппаа нээгээд 🔔 товчоор мэдэгдлээ асаана
      </li>
    </ol>
  );
}

const noopSubscribe = () => () => {};

/**
 * Bottom sheet on phones, centered card on desktop. Portaled to <body>: the sticky header
 * uses backdrop-filter, which would otherwise trap `position: fixed` inside the header.
 */
function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(
    open && (
      // CSS enter animations (@starting-style utilities in globals.css): no animation library in the shared header bundle.
      <div className="fade-enter fixed inset-0 z-50 flex items-end justify-center bg-overlay/50 sm:items-center" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="sheet-enter w-full max-w-md rounded-t-2xl bg-primary p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl ring-1 ring-line sm:rounded-2xl sm:pb-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold text-primary">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Хаах" className="-m-2 rounded-lg p-2 text-fg-quaternary hover:bg-primary_hover">
              <XClose className="size-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    ),
    document.body,
  );
}

/** 🔔 in the header: subscribe/unsubscribe to "important news" push notifications. */
export function NotifyButton() {
  const pwa = usePwa();
  const [sheet, setSheet] = useState(false);
  if (!pwa.pushSupported && !pwa.needsInstallForPush) return null;

  // Always open the sheet first: it says what is sent, and "Асаах" asks the browser for
  // permission. Asking on the bell itself looked dead where the browser hides its prompt.
  const onClick = () => setSheet(true);
  const label = pwa.subscribed ? "Мэдэгдлийн тохиргоо" : "Шинэ мэдээний мэдэгдэл авах";

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pwa.busy}
        aria-label={label}
        title={label}
        className={cx(HEADER_ICON_BUTTON, "relative disabled:opacity-50", pwa.subscribed && "text-brand-secondary ring-brand")}
      >
        {pwa.subscribed ? <BellRinging01 className="size-[18px]" /> : <Bell01 className="size-[18px]" />}
        {!pwa.subscribed && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-risk ring-2 ring-bg-primary" aria-hidden />}
      </button>
      <Sheet
        open={sheet}
        onClose={() => setSheet(false)}
        title={pwa.needsInstallForPush ? "iPhone дээр мэдэгдэл авах" : pwa.subscribed ? "Мэдэгдэл асаалттай 🔔" : "Чухал мэдээг мэдэгдлээр авах"}
      >
        {pwa.needsInstallForPush ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-tertiary">Apple зөвхөн нүүр дэлгэцэнд нэмсэн аппад мэдэгдэл зөвшөөрдөг. Нэг удаа нэмэхэд л болно:</p>
            <IosSteps />
          </div>
        ) : !pwa.subscribed ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-tertiary">
              Өдөрт хэдхэн удаа: улс орны хэмжээний чухал шийдвэр, өндөр эрсдэлтэй мэдээ, өглөө 08:00, орой 20:00 цагийн онцлох тойм. Зар сурталчилгаа илгээхгүй.
            </p>
            {pwa.error && <p className="text-sm text-error-primary">{pwa.error}</p>}
            <button
              type="button"
              onClick={pwa.enablePush}
              disabled={pwa.busy}
              className="rounded-xl bg-brand-solid py-3 text-md font-semibold text-primary_on-brand shadow-xs hover:bg-brand-solid_hover disabled:opacity-60"
            >
              {pwa.busy ? "Асааж байна…" : "Асаах"}
            </button>
            <p className="text-xs text-quaternary">Хөтөч зөвшөөрөл асууна. Дараа нь энэ хонхоор хэзээ ч унтрааж болно.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-tertiary">
              Улс орны хэмжээний чухал шийдвэр, өндөр эрсдэлтэй мэдээ гарахад (2 цаг тутмын шалгалтаар нэг мэдэгдэл) болон өглөө 08:00, орой 20:00 цагийн онцлох тойм бэлэн болоход танд мэдэгдэнэ.
            </p>
            <button
              type="button"
              onClick={pwa.sendTest}
              disabled={pwa.testState === "sending"}
              className="rounded-xl bg-brand-solid py-3 text-md font-semibold text-primary_on-brand shadow-xs hover:bg-brand-solid_hover disabled:opacity-60"
            >
              {pwa.testState === "sending" ? "Илгээж байна…" : "Туршилтын мэдэгдэл илгээх"}
            </button>
            {pwa.testState === "sent" && (
              <p className="text-sm text-success-primary">Илгээлээ. Хэдэн секундэд утсанд тань ирнэ. Ирэхгүй бол Тохиргоо → Мэдэгдэл → ИЛ ТОД асаалттай эсэхийг шалгаарай.</p>
            )}
            {pwa.testState !== "idle" && pwa.testState !== "sending" && pwa.testState !== "sent" && <p className="text-sm text-error-primary">{pwa.testState}</p>}
            <button
              type="button"
              onClick={async () => {
                await pwa.disablePush();
                setSheet(false);
              }}
              className="rounded-xl py-3 text-md font-semibold text-secondary ring-1 ring-primary ring-inset hover:bg-primary_hover"
            >
              Мэдэгдэл унтраах
            </button>
          </div>
        )}
      </Sheet>
    </>
  );
}

/** Phones only: invites to install the app (Android one tap, iOS instructions). */
export function InstallBanner() {
  const pwa = usePwa();
  const [visible, setVisible] = useState(false);
  const [iosSheet, setIosSheet] = useState(false);
  const eligible = !pwa.isStandalone && (pwa.canPromptInstall || pwa.isIOS);

  useEffect(() => {
    if (!eligible || readDismissed()) return;
    const t = setTimeout(() => setVisible(true), 4_000);
    return () => clearTimeout(t);
  }, [eligible]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode: show again next visit */
    }
  };

  const onInstall = async () => {
    if (pwa.isIOS) return setIosSheet(true);
    if (await pwa.install()) setVisible(false);
  };

  return (
    <>
      {visible && eligible && (
        <div className="fixed inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] sheet-enter z-40 md:hidden">
          <div className="flex items-center gap-3 rounded-2xl bg-primary p-3 shadow-xl ring-1 ring-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" className="size-11 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary">ИЛ ТОД апп</p>
              <p className="truncate text-xs text-tertiary">Нүүр дэлгэцнээс нэг товшилтоор, шинэ мэдээний мэдэгдэлтэй</p>
            </div>
            <button
              type="button"
              onClick={onInstall}
              className="flex items-center gap-1 rounded-lg bg-brand-solid px-3 py-2 text-sm font-semibold text-primary_on-brand shadow-xs hover:bg-brand-solid_hover"
            >
              <Download01 className="size-4" /> Суулгах
            </button>
            <button type="button" onClick={dismiss} aria-label="Хаах" className="rounded-lg p-1.5 text-fg-quaternary hover:bg-primary_hover">
              <XClose className="size-4" />
            </button>
          </div>
        </div>
      )}
      <Sheet open={iosSheet} onClose={() => setIosSheet(false)} title="iPhone-д суулгах">
        <IosSteps />
      </Sheet>
    </>
  );
}
