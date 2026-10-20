"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { subscribePush, unsubscribePush } from "@/app/push-actions";

/** Chrome/Edge/Samsung fire this when the app can be installed with one tap. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// The install prompt fires once, possibly before React mounts: keep it module-wide.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    promptListeners.forEach((l) => l());
  });
}

const subscribePrompt = (l: () => void) => {
  promptListeners.add(l);
  return () => promptListeners.delete(l);
};
const noop = () => () => {};

export function usePwa() {
  const canPromptInstall = useSyncExternalStore(subscribePrompt, () => deferredPrompt !== null, () => false);
  const env = useSyncExternalStore(
    noop,
    () => {
      const ua = navigator.userAgent;
      const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      const pushSupported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && Boolean(VAPID_PUBLIC_KEY);
      return `${ios ? 1 : 0}${standalone ? 1 : 0}${pushSupported ? 1 : 0}`;
    },
    () => "000",
  );
  const [isIOS, isStandalone, pushSupported] = [env[0] === "1", env[1] === "1", env[2] === "1"];

  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pushSupported) return;
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then(setSubscription, () => {});
  }, [pushSupported]);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    promptListeners.forEach((l) => l());
    return outcome === "accepted";
  }, []);

  const enablePush = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Мэдэгдэл зөвшөөрөгдөөгүй. Хөтчийн тохиргооноос зөвшөөрнө үү.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }));
      const res = await subscribePush(JSON.parse(JSON.stringify(sub)));
      if (!res.ok) {
        await sub.unsubscribe();
        setError(res.error ?? "Бүртгэж чадсангүй.");
        return;
      }
      setSubscription(sub);
    } catch {
      setError("Мэдэгдэл асааж чадсангүй. Дахин оролдоно уу.");
    } finally {
      setBusy(false);
    }
  }, []);

  const disablePush = useCallback(async () => {
    if (!subscription) return;
    setBusy(true);
    try {
      await unsubscribePush(subscription.endpoint);
      await subscription.unsubscribe();
      setSubscription(null);
    } finally {
      setBusy(false);
    }
  }, [subscription]);

  return {
    isIOS,
    isStandalone,
    canPromptInstall,
    install,
    pushSupported,
    /** iOS only allows web push inside an app added to the home screen. */
    needsInstallForPush: isIOS && !isStandalone,
    subscribed: subscription !== null,
    enablePush,
    disablePush,
    busy,
    error,
  };
}
