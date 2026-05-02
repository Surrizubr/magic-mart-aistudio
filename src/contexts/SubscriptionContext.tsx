import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDevMode } from '@/contexts/DevModeContext';
import { RevenueCatService } from '@/services/revenueCatService';
import { Capacitor } from '@capacitor/core';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

export type SubStatus = 'active' | 'expiring' | 'inactive';

export interface SubscriptionInfo {
  stripe_status?: string;
  revenuecat_status?: string;
  subscription_tier?: string;
  stripe_customer_id?: string | null;
  subscription_end: string | null;
  display_name: string | null;
  email: string;
  entitlement_id?: string;
}

interface SubscriptionContextType {
  status: SubStatus;
  loading: boolean;
  info: SubscriptionInfo | null;
  daysUntilExpiry: number;
  openCheckout: () => Promise<void>;
  openPortal: () => Promise<void>;
  refresh: () => Promise<void>;
  presentPaywall: () => Promise<void>;
  presentCustomerCenter: () => Promise<void>;
  restorePurchases: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { devMode } = useDevMode();
  const { t } = useLanguage();
  const [status, setStatus] = useState<SubStatus>(() => {
    if (devMode) return 'active';
    return 'inactive'; // Default to inactive while loading
  });
  const [loading, setLoading] = useState(true);

  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState(0);

  const applySubscriptionState = useCallback((profile: SubscriptionInfo | null) => {
    setInfo(profile);

    if (!profile || !profile.subscription_end) {
      setDaysUntilExpiry(0);
      setStatus('inactive');
      return;
    }

    const now = new Date();
    const end = new Date(profile.subscription_end);
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    setDaysUntilExpiry(diffDays);

    if (diffDays <= 0) {
      setStatus('inactive');
    } else if (diffDays <= 30) {
      setStatus('expiring');
    } else {
      setStatus('active');
    }
  }, []);

  const fetchProfile = useCallback(async (): Promise<SubscriptionInfo | null> => {
    if (!user) return null;

    const { data, error, status: httpStatus } = await supabase
      .from('profiles')
      .select('stripe_status, revenuecat_status, subscription_tier, stripe_customer_id, subscription_end, display_name, user_id')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (httpStatus === 406 || error.code === 'PGRST116') {
        const { data: newData, error: insertError } = await supabase
          .from('profiles')
          .insert({ user_id: user.id, display_name: user.email?.split('@')[0] || '' })
          .select()
          .single();
        
        if (insertError) return null;
        return {
          stripe_status: (newData as any).stripe_status || 'inactive',
          revenuecat_status: (newData as any).revenuecat_status || 'inactive',
          subscription_tier: (newData as any).subscription_tier || 'free',
          stripe_customer_id: (newData as any).stripe_customer_id,
          subscription_end: (newData as any).subscription_end,
          display_name: newData.display_name,
          email: user.email || '',
        };
      }
      return null;
    }
    
    if (!data) return null;

    return {
      stripe_status: (data as any).stripe_status || 'inactive',
      revenuecat_status: (data as any).revenuecat_status || 'inactive',
      subscription_tier: (data as any).subscription_tier || 'free',
      stripe_customer_id: (data as any).stripe_customer_id,
      subscription_end: (data as any).subscription_end,
      display_name: data.display_name,
      email: user.email || '',
    };
  }, [user]);

  const syncSubscriptionFromStripe = useCallback(async (): Promise<any | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        body: {},
        headers: { 'apikey': SUPABASE_PUBLISHABLE_KEY || '' }
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('check-subscription failed', error);
      return null;
    }
  }, []);

  const checkSubscription = useCallback(async ({ forceSync = false }: { forceSync?: boolean } = {}) => {
    setLoading(true);
    if (!user) {
      applySubscriptionState(null);
      setLoading(false);
      return;
    }

    if (devMode) {
      setStatus('active');
      setLoading(false);
      return;
    }

    let isPremiumRC = false;
    let rcExpirationDate: string | null = null;

    // 1. Check RevenueCat (especially important on Mobile)
    try {
      await RevenueCatService.logIn(user.id);
      const customerInfo = await RevenueCatService.getCustomerInfo();
      const activeEntitlement = customerInfo.entitlements.active['IDAPPS Premium'];
      
      if (activeEntitlement) {
        isPremiumRC = true;
        rcExpirationDate = activeEntitlement.expirationDate || null;
      }
    } catch (error) {
      console.warn('RevenueCat check skipped or failed (common on web):', error);
    }

    // 2. Check Supabase Profile (which includes Stripe status from webhooks)
    let profile = await fetchProfile();
    
    // 3. Conditional Stripe Sync (if not already pro via DB or RC)
    const isProInDb = profile?.stripe_status === 'active' || profile?.subscription_tier === 'pro';
    if (!isPremiumRC && !isProInDb && (forceSync || !profile)) {
      const stripeSync = await syncSubscriptionFromStripe();
      if (stripeSync?.subscribed) {
        profile = {
          ...profile,
          stripe_status: 'active',
          stripe_customer_id: stripeSync.customer_id || profile?.stripe_customer_id || null,
          subscription_end: stripeSync.subscription_end || profile?.subscription_end || null,
          email: user.email || '',
        } as SubscriptionInfo;
      }
    }

    // 4. Final Merging of State
    if (isPremiumRC) {
      // Prioritize RC if it's active
      applySubscriptionState({
        ...profile,
        subscription_end: rcExpirationDate, // Use the latest from RC
        entitlement_id: 'IDAPPS Premium',
        email: user.email || '',
      } as SubscriptionInfo);
      localStorage.setItem(`sub_status_${user.id}`, 'active');
    } else if (profile && (profile.stripe_status === 'active' || profile.subscription_tier === 'pro')) {
      // Use Stripe/DB info
      applySubscriptionState(profile);
      localStorage.setItem(`sub_status_${user.id}`, 'active');
    } else {
      // Not subscribed anywhere
      applySubscriptionState(null);
      localStorage.removeItem(`sub_status_${user.id}`);
    }
    
    setLoading(false);
  }, [applySubscriptionState, fetchProfile, user, devMode, syncSubscriptionFromStripe]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const openCheckout = async () => {
    if (Capacitor.isNativePlatform()) {
      await presentPaywall();
      return;
    }
    
    // Stripe Checkout for Web
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {},
        headers: { 'apikey': SUPABASE_PUBLISHABLE_KEY || '' }
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error(t('errorOpeningCheckout') || 'Erro ao abrir checkout');
    }
  };

  const openPortal = async () => {
    if (Capacitor.isNativePlatform()) {
      await RevenueCatService.presentCustomerCenter();
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        body: {},
        headers: { 'apikey': SUPABASE_PUBLISHABLE_KEY || '' }
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (err) {
      console.error('Portal error:', err);
      toast.error(t('errorOpeningPortal') || 'Erro ao abrir portal');
    }
  };

  const presentPaywall = async () => {
    setLoading(true);
    try {
      const purchased = await RevenueCatService.presentPaywall();
      if (purchased) {
        toast.success(t('welcomeBack') || 'Assinatura confirmada!');
        await checkSubscription({ forceSync: true });
      } else {
        // Only show if not on native? Actually, just log for now
        console.log('Paywall closed or failed');
      }
    } catch (error) {
      console.error('Paywall error:', error);
    }
    setLoading(false);
  };

  const presentCustomerCenter = async () => {
    await RevenueCatService.presentCustomerCenter();
  };

  const restorePurchases = async () => {
    setLoading(true);
    try {
      await RevenueCatService.restorePurchases();
      await checkSubscription({ forceSync: true });
    } catch (error) {
      console.error('Restore failed:', error);
    }
    setLoading(false);
  };

  return (
    <SubscriptionContext.Provider value={{
      status,
      loading,
      info,
      daysUntilExpiry,
      openCheckout,
      openPortal,
      refresh: checkSubscription,
      presentPaywall,
      presentCustomerCenter,
      restorePurchases
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
}
