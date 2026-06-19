"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useLocale } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { phoneLoginOrSignup } from "@/app/actions/auth";

interface Labels {
  phone: string;
  password: string;
  login: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {label}
    </Button>
  );
}

export function PhoneLoginForm({ labels }: { labels: Labels }) {
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);

  async function action(formData: FormData) {
    setError(null);
    formData.set("locale", locale);
    const res = await phoneLoginOrSignup(formData);
    if (res && "error" in res) setError(res.error);
  }

  return (
    <form action={action} className="flex flex-col flex-1 px-7 pt-8">
      <div className="flex flex-col gap-3.5">
        <Input name="phone" label={labels.phone} prefix="+993" placeholder="65 12 34 56" inputMode="tel" required />
        <Input name="password" label={labels.password} type="password" placeholder="••••••••" required minLength={6} />
        {error && (
          <p className="text-danger text-[13px]">
            {error === "wrong_password"
              ? "Неверный пароль"
              : error === "invalid_input"
              ? "Заполните оба поля (минимум 6 символов)"
              : "Не удалось войти"}
          </p>
        )}
      </div>
      <div className="flex-1" />
      <div className="pb-12">
        <SubmitButton label={labels.login} />
      </div>
    </form>
  );
}
