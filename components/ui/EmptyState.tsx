import Link from "next/link";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-9 py-14 gap-4">
      <div className="w-[84px] h-[84px] rounded-3xl bg-surface border border-border flex items-center justify-center text-primary">
        {icon}
      </div>
      <div>
        <div className="font-display font-extrabold text-[20px] text-text">{title}</div>
        {description && (
          <div className="text-[14.5px] leading-relaxed text-text-muted mt-2 max-w-[260px]">
            {description}
          </div>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="h-12 px-6 rounded-xl bg-primary text-primary-text font-display font-extrabold text-[15px] inline-flex items-center"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
