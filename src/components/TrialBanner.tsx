import { useLanguage } from '@/contexts/LanguageContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function TrialBanner() {
  const { status, daysUntilExpiry, openCheckout } = useSubscription();
  const { t } = useLanguage();

  // Show only if "inactive" which means in trial or just plain unpaid
  if (status !== 'inactive' || daysUntilExpiry <= 0) return null;

  const daysLeft = daysUntilExpiry;
  const plural = daysLeft !== 1;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-4"
    >
      <button 
        onClick={() => openCheckout()}
        className="w-full p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex items-center justify-between group transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-foreground">
              {daysLeft} {plural ? t('dayPlural') : t('day')}{' '}
              <span className="text-primary">{plural ? t('trialDaysLeftPlural') : t('trialDaysLeft')}</span>
            </p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Assine para manter o acesso</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:translate-x-1 transition-transform">
          <ArrowRight className="w-4 h-4" />
        </div>
      </button>
    </motion.div>
  );
}
