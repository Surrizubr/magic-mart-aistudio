import { useLanguage } from '@/contexts/LanguageContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Sparkles, CreditCard, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SubscriptionBanner() {
  const { status, daysUntilExpiry, openCheckout } = useSubscription();
  const { t, currency } = useLanguage();

  if (status === 'active') return null;

  if (status === 'expiring') {
    const daysLeft = daysUntilExpiry;
    return (
      <div className="mx-4 mt-4 p-4 rounded-3xl bg-orange-500/10 border border-orange-500/20">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-orange-500">Expira em breve</p>
            <p className="text-sm font-bold text-foreground mt-0.5">
              Faltam {daysLeft} {daysLeft !== 1 ? t('dayPlural') : t('day')}{' '}
              <span className="text-muted-foreground font-medium">{t('subExpiryWarning')}</span>
            </p>
          </div>
        </div>
        <Button 
          onClick={() => openCheckout()} 
          className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold h-12 rounded-2xl shadow-lg shadow-orange-500/20"
        >
          Renovar Agora
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-4 p-5 rounded-[32px] bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white relative overflow-hidden shadow-xl shadow-primary/20">
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-black/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black leading-none">{t('subBannerTitle')}</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mt-1.5">
              {currency} 49,90{t('premiumPerYear')} · {t('subBannerCancel')}
            </p>
          </div>
        </div>

        <Button 
          onClick={() => openCheckout()} 
          className="w-full bg-white text-primary hover:bg-white/90 font-black h-12 rounded-2xl shadow-lg shadow-black/5 group"
        >
          Quero ser Premium
          <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
}
