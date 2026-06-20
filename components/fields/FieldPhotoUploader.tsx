"use client";

import { useRef, useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { uploadFieldPhoto, removeFieldPhoto } from "@/app/actions/uploads";

export function FieldPhotoUploader({
  fieldId,
  photos,
}: {
  fieldId: string;
  photos: string[];
}) {
  const locale = useLocale();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [isPending, startTransition] = useTransition();
  const atCap = photos.length >= 8;

  function onPick(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      alert("Файл больше 5 MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Только JPG, PNG или WebP");
      return;
    }
    setBusy(true);
    formRef.current?.requestSubmit();
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        ref={formRef}
        action={async (fd) => {
          fd.set("fieldId", fieldId);
          fd.set("locale", locale);
          await uploadFieldPhoto(fd);
          setBusy(false);
          if (fileRef.current) fileRef.current.value = "";
        }}
      >
        <input
          ref={fileRef}
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
          }}
        />
      </form>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url) => (
            <div
              key={url}
              className="relative aspect-square rounded-xl overflow-hidden border border-border bg-surface"
            >
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                aria-label="remove"
                disabled={isPending}
                onClick={() => {
                  if (!confirm("Удалить фото?")) return;
                  startTransition(() =>
                    removeFieldPhoto(fieldId, url, locale),
                  );
                }}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white text-[12px] font-bold flex items-center justify-center disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={busy || atCap}
        onClick={() => fileRef.current?.click()}
        className="h-11 rounded-xl border border-white/15 text-text-soft font-display font-bold text-[13px] flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 8h3l1.5-2h9L18 8h3v11H3z" />
          <circle cx="12" cy="13" r="3.5" />
          <path d="M19 4v6M16 7h6" />
        </svg>
        {busy
          ? "Загрузка…"
          : atCap
          ? "Максимум 8 фото"
          : photos.length === 0
          ? "Добавить первое фото"
          : "Добавить ещё фото"}
      </button>
    </div>
  );
}
