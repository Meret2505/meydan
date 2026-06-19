"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useLocale } from "next-intl";
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

function formatPhoneDisplay(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const a = digits.slice(0, 2);
  const b = digits.slice(2, 4);
  const c = digits.slice(4, 6);
  const d = digits.slice(6, 8);
  return [a, b, c, d].filter(Boolean).join(" ");
}

export function PhoneLoginForm({ labels }: { labels: Labels }) {
  const locale = useLocale();
  const [phone, setPhone] = useState("");
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
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-[#8A938E]">
            {labels.phone}
          </span>
          <div className="flex items-center gap-2.5 h-14 rounded-[15px] bg-[#13181A] border border-white/10 px-4 focus-within:border-primary">
            <span className="font-display font-bold text-[15px] text-[#C7CEC9]">
              +993
            </span>
            <div className="w-px h-5 bg-white/10" />
            <input
              name="phone"
              value={phone}
              onChange={(e) => setPhone(formatPhoneDisplay(e.target.value))}
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="65 12 34 56"
              required
              className="flex-1 bg-transparent outline-none text-text font-sans font-semibold text-[16px] placeholder:text-text-muted tracking-wide"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-[#8A938E]">
            {labels.password}
          </span>
          <input
            name="password"
            type="password"
            placeholder="••••••••"
            required
            minLength={6}
            autoComplete="current-password"
            className="h-14 rounded-[15px] bg-[#13181A] border border-white/10 px-4 text-text font-sans font-semibold text-[16px] outline-none focus:border-primary"
          />
        </div>

        {error && (
          <p className="text-danger text-[13px]">
            {error === "wrong_password"
              ? "Неверный пароль"
              : error === "invalid_input"
              ? "Введите 8 цифр номера и пароль (минимум 6 символов)"
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
