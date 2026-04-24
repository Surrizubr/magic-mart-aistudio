import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useDevMode } from '@/contexts/DevModeContext';
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
  
  const [timedOut, setTimedOut] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (user && subLoading && !devMode && !timedOut) {
      const start = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - start;
        const p = Math.min((elapsed / 3000) * 100, 98);
        setProgress(p);
        if (elapsed >= 3000) {
          setTimedOut(true);
          setProgress(100);
          clearInterval(interval);
        }
      }, 50);
      return () => clearInterval(interval);
    }
  }, [user, subLoading, devMode, timedOut]);

  // 1. Initial Auth Loading
  if (authLoading) {
    return <SplashScreen progress={30} />;
  }

  // 2. Not Logged In
  if (!user && !devMode) {
    return <LoginPage />;
  }

  // 3. Subscription Loading (with 3s timeout)
  if (subLoading && !devMode && !timedOut) {
    return <SplashScreen progress={progress} />;
  }

  // 4. Subscription Check Finished (or Timed Out)
  // If still loading but timed out, we allow entry. 
  // If NOT loading, we check the actual status.
  if (!subLoading || devMode) {
    if (status !== 'active' && status !== 'expiring' && !devMode) {
      return <PricingPage />;
    }
  }

  // If we are here, either:
  // - subLoading is false and status is OK
  // - subLoading is true but timedOut is true (background check continues)
  return <>{children}</>;
}
