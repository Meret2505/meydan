export function formatGameDateTime(d: Date, locale: string) {
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();

  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);
  let day: string;
  if (sameDay) day = locale === "tm" ? "Şu gün" : "Сегодня";
  else if (isTomorrow) day = locale === "tm" ? "Ertir" : "Завтра";
  else day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d);
  return { time, day };
}

export function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
