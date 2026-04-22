import { useLanguage } from '@/contexts/LanguageContext';
import { useSubscription } from '@/hooks/useSubscription';
import { CreditCard, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RenewalBanner() {
  const { status, daysUntilExpiry, openCheckout } = useSubscription();
  const { t } = useLanguage();

  if (status !== 'expiring') return null;

  return (
    <div className="mx-4 mt-4 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex flex-col gap-3">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-orange-500 flex items-center gap-1.5 uppercase tracking-wider">
            Assinatura Expira em breve
          </p>
          <p className="text-sm font-medium text-foreground/80 leading-snug mt-1">
            Faltam <span className="font-bold text-orange-600">{daysUntilExpiry} {daysUntilExpiry !== 1 ? t('dayPlural') : t('day')}</span> {t('subExpiryWarning')}
          </p>
        </div>
      </div>
      <Button 
        onClick={() => openCheckout()} 
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-10 rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
      >
        <CreditCard className="w-4 h-4" />
        Renovar Agora
      </Button>
    </div>
  );
}
