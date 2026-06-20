"use client";

import { useRef, useState } from "react";
import { useLocale } from "next-intl";
import { uploadAvatar, removeAvatar } from "@/app/actions/uploads";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export function AvatarUploader({
  name,
  current,
  size = 104,
}: {
  name: string;
  current: string | null;
  size?: number;
}) {
  const locale = useLocale();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(current);
  const [busy, setBusy] = useState(false);

  function onPick(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      alert("Файл больше 5 MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Только JPG, PNG или WebP");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setPreview(String(e.target?.result ?? ""));
    reader.readAsDataURL(file);
    setBusy(true);
    formRef.current?.requestSubmit();
  }

  async function onRemove() {
    setBusy(true);
    try {
      await removeAvatar(locale);
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <form
        ref={formRef}
        action={async (fd) => {
          fd.set("locale", locale);
          await uploadAvatar(fd);
          setBusy(false);
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

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        aria-label="upload avatar"
        className="relative rounded-full flex items-center justify-center font-display font-extrabold text-[#06210F] disabled:opacity-60"
        style={{
          width: size,
          height: size,
          background: preview
            ? undefined
            : "linear-gradient(140deg,#1FD16B,#14a955)",
          fontSize: Math.round(size * 0.36),
        }}
      >
        {preview ? (
          <img
            src={preview}
            alt={name}
            className="w-full h-full rounded-full object-cover"
            draggable={false}
          />
        ) : (
          initials(name)
        )}
        <span
          className="absolute right-0 bottom-0 w-9 h-9 rounded-full bg-surface flex items-center justify-center text-text-soft"
          style={{ border: "2px solid #0B0E0D" }}
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
          </svg>
        </span>
      </button>

      {preview && (
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          className="text-text-muted text-[12.5px] font-bold disabled:opacity-50"
        >
          Удалить фото
        </button>
      )}
    </div>
  );
}
