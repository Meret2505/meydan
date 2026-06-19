"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();
  const ru = locale !== "tm";

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center gap-3">
      <div className="text-5xl">😵</div>
      <h1 className="font-display font-extrabold text-[22px]">
        {ru ? "Что-то пошло не так" : "Bir zat ýalňyş geçdi"}
      </h1>
      <p className="text-text-muted text-[14px] max-w-xs">
        {ru
          ? "Это редкая ошибка. Перезагрузи страницу или вернись позже."
          : "Seýrek ýüze çykýan ýalňyşlyk. Sahypany täzeden ýükläň ýa-da soň gaýdyp geliň."}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-2 h-11 px-5 rounded-xl bg-primary text-primary-text font-display font-extrabold text-[14px]"
      >
        {ru ? "Попробовать снова" : "Täzeden synanyşmak"}
      </button>
    </div>
  );
}
