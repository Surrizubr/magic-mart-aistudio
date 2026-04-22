import { ReactNode } from 'react';
import { Menu } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  onMenuOpen?: () => void;
}

export function PageHeader({ title, subtitle, action, onMenuOpen }: PageHeaderProps) {
  return (
    <header className="px-6 py-6 pb-2 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-foreground tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {onMenuOpen && (
            <button 
              onClick={onMenuOpen}
              className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-foreground shadow-sm active:scale-95 transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
