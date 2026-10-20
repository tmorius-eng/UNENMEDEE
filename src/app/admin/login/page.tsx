import type { Metadata } from "next";

import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Админ нэвтрэх", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-16">
      <div>
        <h1 className="text-display-xs font-semibold text-primary">Редакцийн самбар</h1>
        <p className="mt-1 text-sm text-tertiary">ADMIN_SECRET_PASSWORD-оор нэвтэрнэ.</p>
      </div>
      <div className="rounded-2xl bg-primary p-6 ring-1 ring-secondary ring-inset">
        <LoginForm />
      </div>
    </div>
  );
}
