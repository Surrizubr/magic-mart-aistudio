import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useDevMode } from '@/contexts/DevModeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LoginPage } from '@/pages/LoginPage';
import { PricingPage } from '@/pages/PricingPage';
import { SplashScreen } from '@/components/SplashScreen';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { status, loading: subLoading } = useSubscription();
  const { devMode } = useDevMode();
  const { t } = useLanguage();
  
  // 1. Initial Auth Loading
  if (authLoading) {
    return <SplashScreen progress={30} message={t('loadingApp')} />;
  }

  // 2. Not Logged In
  if (!user && !devMode) {
    return <LoginPage />;
  }

  // 3. Subscription Check Finished (Redirect ONLY if confirmed inactive)
  // We prioritize entering the app directly (children).
  // If subLoading is finished and status is not active/expiring, we redirect.
  // Note: We check user exists to avoid redirecting during auth transitions.
  if (!subLoading && user && !devMode && status !== 'active' && status !== 'expiring') {
    return <PricingPage />;
  }

  // Still loading or status is OK or in devMode
  return <>{children}</>;
}
