import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useDevMode } from '@/contexts/DevModeContext';
import { LoginPage } from '@/pages/LoginPage';
import { PricingPage } from '@/pages/PricingPage';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { status, loading: subLoading } = useSubscription();
  const { devMode } = useDevMode();

  if (authLoading || (subLoading && !devMode)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center animate-bounce mb-2">
          <span className="text-3xl font-bold text-white">🌿</span>
        </div>
        <div className="w-full max-w-[200px] text-center space-y-3">
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            carregando a aplicação. Aguarde.
          </p>
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="h-full gradient-primary"
            />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (status !== 'active' && status !== 'expiring' && !devMode) {
    return <PricingPage />;
  }

  return <>{children}</>;
}
