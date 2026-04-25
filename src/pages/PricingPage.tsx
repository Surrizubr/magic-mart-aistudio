import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, LogOut } from 'lucide-react';
import { supabase, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { toast } from 'sonner';

export function PricingPage() {
  const { t, currency } = useLanguage();
  const { openCheckout, restorePurchases, loading: checkoutLoading, status, loading: subLoading } = useSubscriptionContext();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    await openCheckout();
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const showSubscribeButton = !subLoading && status === 'inactive';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto">
            <Crown className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t('subBannerTitle')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('pricingDesc')}
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-primary/30 p-6 space-y-4 shadow-lg text-center">
          <div>
            <p className="text-3xl font-bold text-foreground">{currency} 49,90</p>
            <p className="text-sm text-muted-foreground">{t('premiumPerYear')}</p>
          </div>

          <div className="space-y-2 text-left">
            {[
              t('pricingFeature1'),
              t('pricingFeature2'),
              t('pricingFeature3'),
              t('pricingFeature4'),
              t('pricingFeature5'),
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>

          {showSubscribeButton && (
            <button
              onClick={handleCheckout}
              disabled={loading || checkoutLoading}
              className="w-full mt-4 p-3 rounded-xl gradient-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {(loading || checkoutLoading) ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {t('processing')}
                </>
              ) : (
                t('premiumSubscribe')
              )}
            </button>
          )}

          {!showSubscribeButton && subLoading && (
            <div className="w-full mt-4 p-3 flex items-center justify-center gap-2 text-muted-foreground text-sm">
              <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              {t('checkingSubscription')}
            </div>
          )}
        </div>

        <button
          onClick={restorePurchases}
          disabled={loading || subLoading}
          className="w-full flex items-center justify-center gap-2 p-3 text-xs text-muted-foreground hover:text-primary transition-colors font-medium border border-dashed border-muted-foreground/20 rounded-xl"
        >
          {t('restorePurchase')}
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t('logout')}
        </button>
      </motion.div>
    </div>
  );
}
