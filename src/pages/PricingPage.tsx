import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, LogOut } from 'lucide-react';
import { supabase, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';

export function PricingPage() {
  const { t, currency } = useLanguage();
  const { openCheckout, loading: checkoutLoading } = useSubscriptionContext();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    await openCheckout();
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

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
            {t('pricingDesc') || 'Gerencie compras, estoque e gastos com inteligência artificial.'}
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-primary/30 p-6 space-y-4 shadow-lg">
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">{currency} 49,90</p>
            <p className="text-sm text-muted-foreground">{t('premiumPerYear')}</p>
          </div>

          <div className="space-y-2">
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

          <button
            onClick={handleCheckout}
            disabled={loading || checkoutLoading}
            className="w-full p-3 rounded-xl gradient-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
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

        </div>

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
