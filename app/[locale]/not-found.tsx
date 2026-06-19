import Link from "next/link";

export default function LocaleNotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center gap-3">
      <div className="text-5xl">🥅</div>
      <h1 className="font-display font-extrabold text-[22px]">Не найдено</h1>
      <p className="text-text-muted text-[14px] max-w-xs">
        Страница не существует или больше недоступна.
      </p>
      <Link
        href="/"
        className="mt-2 h-11 px-5 rounded-xl bg-primary text-primary-text font-display font-extrabold text-[14px] inline-flex items-center"
      >
        На главную
      </Link>
    </div>
  );
}
