import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white/60 px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal/8 text-teal">
        <Icon size={22} />
      </div>
      <p className="font-display font-semibold text-ink">{title}</p>
      {description && <p className="mt-1.5 max-w-xs text-sm text-ink/50">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
