import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDevMode } from '@/contexts/DevModeContext';
import { RevenueCatService } from '@/services/revenueCatService';

export type SubStatus = 'active' | 'expiring' | 'inactive';

const USE_REVENUECAT = true; // Set to false to reactivate Stripe

export interface SubscriptionInfo {
  stripe_status?: string;
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
      .select('stripe_status, stripe_customer_id, subscription_end, display_name, user_id')
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
      stripe_customer_id: (data as any).stripe_customer_id,
      subscription_end: (data as any).subscription_end,
      display_name: data.display_name,
      email: user.email || '',
    };
  }, [user]);

  const syncSubscriptionFromStripe = useCallback(async (): Promise<any | null> => {
    if (USE_REVENUECAT) return null; // Deactivated Stripe
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

    if (USE_REVENUECAT) {
      try {
        await RevenueCatService.logIn(user.id);
        const customerInfo = await RevenueCatService.getCustomerInfo();
        const activeEntitlement = customerInfo.entitlements.active['IDAPPS Premium'];

        if (activeEntitlement) {
          const profile: SubscriptionInfo = {
            subscription_end: activeEntitlement.expirationDate || null,
            display_name: null,
            email: user.email || '',
            entitlement_id: 'IDAPPS Premium'
          };
          applySubscriptionState(profile);
          localStorage.setItem(`sub_status_${user.id}`, 'active');
        } else {
          applySubscriptionState(null);
          localStorage.removeItem(`sub_status_${user.id}`);
        }
      } catch (error) {
        console.error('RevenueCat check failed:', error);
      }
    } else {
      // Original Stripe Logic
      let profile = await fetchProfile();
      const shouldSyncWithStripe = forceSync || !profile || profile.stripe_status !== 'active';
      if (shouldSyncWithStripe) {
        const stripeSync = await syncSubscriptionFromStripe();
        if (stripeSync?.subscribed) {
          profile = {
            stripe_status: 'active',
            stripe_customer_id: stripeSync.customer_id || profile?.stripe_customer_id || null,
            subscription_end: stripeSync.subscription_end || profile?.subscription_end || null,
            display_name: profile?.display_name || null,
            email: user.email || '',
          };
        }
      }
      applySubscriptionState(profile);
    }
    
    setLoading(false);
  }, [applySubscriptionState, fetchProfile, user, devMode, syncSubscriptionFromStripe]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const openCheckout = async () => {
    if (USE_REVENUECAT) {
      await presentPaywall();
      return;
    }
    // Stripe Checkout
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {},
        headers: { 'apikey': SUPABASE_PUBLISHABLE_KEY || '' }
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
    }
  };

  const openPortal = async () => {
    if (USE_REVENUECAT) {
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
    }
  };

  const presentPaywall = async () => {
    setLoading(true);
    const purchased = await RevenueCatService.presentPaywall();
    if (purchased) {
      await checkSubscription({ forceSync: true });
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
