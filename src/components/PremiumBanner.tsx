import { useLanguage } from '@/contexts/LanguageContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Sparkles } from 'lucide-react';

export function PremiumBanner() {
  const { status } = useSubscription();
  const { t, currency } = useLanguage();

  if (status !== 'active') return null;

  return (
    <div className="mx-4 mt-4 p-5 rounded-[32px] bg-card border border-border flex items-center gap-4 group transition-all hover:border-primary/30 shadow-sm">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
        <Sparkles className="w-6 h-6 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-black text-foreground uppercase tracking-widest leading-none mb-1.5">{t('premiumTitle')}</h3>
        <p className="text-xs font-medium text-muted-foreground leading-relaxed">
          {t('premiumDesc')} <span className="text-foreground font-black">{currency} 49,90{t('premiumPerYear')}</span>
        </p>
      </div>
    </div>
  );
}
