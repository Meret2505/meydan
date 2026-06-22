import { unstable_setRequestLocale } from "next-intl/server";
import { locales } from "@/i18n";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata = {
  title: "Политика конфиденциальности — MEÝDAN",
};

export default function PrivacyPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  return (
    <main className="mx-auto max-w-[680px] px-6 py-10 text-text">
      <h1 className="font-display font-extrabold text-[26px] tracking-tight">
        Политика конфиденциальности
      </h1>
      <p className="text-text-muted text-[13px] mt-1">
        Обновлено: 22 июня 2026 г.
      </p>

      <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-text-soft">
        <p>
          MEÝDAN («приложение», «мы») — сервис для поиска футбольных игр, команд и
          полей. Настоящая политика описывает, какие данные мы собираем и как их
          используем.
        </p>

        <Section title="Какие данные мы собираем">
          <ul className="list-disc pl-5 space-y-1">
            <li>Имя и фото профиля, которые вы указываете.</li>
            <li>
              Номер телефона или адрес электронной почты — для входа и
              идентификации (вход через Google или по номеру телефона).
            </li>
            <li>
              Игровой профиль: позиция, район, возраст и уровень — для подбора игр
              и игроков.
            </li>
            <li>
              Данные об активности в приложении: созданные и посещённые игры,
              команды, турниры.
            </li>
          </ul>
        </Section>

        <Section title="Как мы используем данные">
          <ul className="list-disc pl-5 space-y-1">
            <li>Чтобы показывать игры и игроков рядом с вами.</li>
            <li>Чтобы вы могли создавать игры, команды и регистрироваться на турниры.</li>
            <li>Чтобы отправлять уведомления о приглашениях и матчах.</li>
          </ul>
          <p className="mt-2">
            Мы не продаём ваши персональные данные третьим лицам.
          </p>
        </Section>

        <Section title="Видимость данных">
          <p>
            Ваше имя, фото, позиция и район видны другим пользователям для подбора
            игр. Номер телефона не показывается в публичном профиле.
          </p>
        </Section>

        <Section title="Хранение и удаление">
          <p>
            Данные хранятся, пока существует ваш аккаунт. Чтобы удалить аккаунт и
            связанные данные, напишите нам — мы удалим их в разумный срок.
          </p>
        </Section>

        <Section title="Контакты">
          <p>
            По вопросам конфиденциальности: напишите на адрес поддержки, указанный
            на странице приложения в Google Play.
          </p>
        </Section>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display font-bold text-[17px] text-text mt-6 mb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}
