import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDevMode } from '@/contexts/DevModeContext';

export type SubStatus = 'active' | 'expiring' | 'inactive';

export interface SubscriptionInfo {
  stripe_status: string;
  stripe_customer_id: string | null;
  subscription_end: string | null;
  display_name: string | null;
  email: string;
}

interface SubscriptionContextType {
  status: SubStatus;
  loading: boolean;
  info: SubscriptionInfo | null;
  daysUntilExpiry: number;
  openCheckout: () => Promise<void>;
  openPortal: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { devMode } = useDevMode();
  const [status, setStatus] = useState<SubStatus>('inactive');
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState(0);

  const applySubscriptionState = useCallback((profile: SubscriptionInfo | null) => {
    setInfo(profile);

    if (!profile || profile.stripe_status !== 'active' || !profile.subscription_end) {
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

    const { data, error, status, statusText } = await supabase
      .from('profiles')
      .select('stripe_status, stripe_customer_id, subscription_end, display_name, user_id')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // 406 usually means .single() found no rows. Let's try to create the profile.
      if (status === 406 || error.code === 'PGRST116') {
        console.warn('Profile not found, attempting to create one...');
        const { data: newData, error: insertError } = await supabase
          .from('profiles')
          .insert({ user_id: user.id, display_name: split_part(user.email || '', '@', 1) })
          .select()
          .single();
        
        if (insertError) {
          console.error('Failed to auto-create profile:', insertError);
          return null;
        }
        return {
          stripe_status: (newData as any).stripe_status || 'inactive',
          stripe_customer_id: (newData as any).stripe_customer_id,
          subscription_end: (newData as any).subscription_end,
          display_name: newData.display_name,
          email: user.email || '',
        };
      }
      console.error('Fetch profile failed with status:', status, statusText, error);
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

  // Helper for split_part equivalent in JS
  function split_part(str: string, sep: string, part: number) {
    return str.split(sep)[part - 1] || str;
  }

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
    if (!user) {
      applySubscriptionState(null);
      localStorage.removeItem(`sub_status_${user?.id}`);
      setLoading(false);
      return;
    }

    if (devMode) {
      setStatus('active');
      setLoading(false);
      return;
    }

    // Fast-path: check cache first to avoid flickering if we already know it's active
    const cached = localStorage.getItem(`sub_status_${user.id}`);
    if (cached !== 'active' || forceSync) {
        setLoading(true);
    }

    let profile = await fetchProfile();

    const shouldSyncWithStripe =
      forceSync ||
      !profile ||
      profile.stripe_status !== 'active' ||
      !profile.subscription_end ||
      new Date(profile.subscription_end).getTime() <= Date.now();

    if (shouldSyncWithStripe) {
      const stripeSync = await syncSubscriptionFromStripe();
      if (stripeSync?.subscribed) {
        // Trust the stripe sync result over the database profile if it confirms subscription
        profile = {
          stripe_status: 'active',
          stripe_customer_id: stripeSync.customer_id || profile?.stripe_customer_id || null,
          subscription_end: stripeSync.subscription_end || profile?.subscription_end || null,
          display_name: profile?.display_name || null,
          email: user.email || '',
        };
        localStorage.setItem(`sub_status_${user.id}`, 'active');
      } else {
        localStorage.removeItem(`sub_status_${user.id}`);
      }
    } else if (profile?.stripe_status === 'active') {
      localStorage.setItem(`sub_status_${user.id}`, 'active');
    }

    applySubscriptionState(profile);
    setLoading(false);
  }, [applySubscriptionState, fetchProfile, user, devMode, syncSubscriptionFromStripe]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get('checkout');
    const sessionId = params.get('session_id');

    if (user && checkoutStatus === 'success' && sessionId) {
      window.history.replaceState({}, '', window.location.pathname);
      (async () => {
        setLoading(true);
        try {
          await supabase.functions.invoke('verify-checkout', {
            body: { session_id: sessionId },
          });
        } catch (e) {
          console.error('verify-checkout failed', e);
        }

        for (let i = 0; i < 10; i++) {
          const syncResult = await syncSubscriptionFromStripe();
          if (syncResult?.subscribed) break;
          await new Promise((r) => setTimeout(r, 2000));
        }

        await checkSubscription({ forceSync: true });
      })();
    } else {
      checkSubscription();
    }
  }, [checkSubscription, user, syncSubscriptionFromStripe]);

  const openCheckout = async () => {
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

  return (
    <SubscriptionContext.Provider value={{
      status,
      loading,
      info,
      daysUntilExpiry,
      openCheckout,
      openPortal,
      refresh: checkSubscription
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
