import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export function LoginPage() {
  const { t } = useLanguage();

  const handleGoogleLogin = async () => {
    console.log('[Login] Starting Google login with Popup...');
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          //redirectTo: window.location.origin, // Supabase handles this better with popup
          skipBrowserRedirect: true,
          queryParams: {
            prompt: 'select_account',
          }
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Abre o link do Google em uma nova janela (Popup)
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          data.url,
          'google-login',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
          toast.error(t('popupBlockedError'));
          return;
        }

        // Monitora o fechamento da janela ou mudança de URL para detectar sucesso
        const checkPopup = setInterval(async () => {
          try {
            if (popup.closed) {
              clearInterval(checkPopup);
              console.log('[Login] Popup closed, checking session...');
              const { data: sessionData } = await supabase.auth.getSession();
              if (sessionData.session) {
                toast.success(t('loginSuccessToast'));
                // O useAuth detectará a mudança de estado automaticamente
              }
            }
          } catch (e) {
            // Ignora erros de cross-origin antes do redirecionamento final
          }
        }, 1000);
      }
    } catch (err: any) {
      console.error('[Login] Error:', err);
      toast.error(err.message || t('loginError'));
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto">
            <span className="text-3xl">🌿</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Magicmart AI</h1>
          <p className="text-sm text-muted-foreground">{t('appTagline')}</p>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span className="text-sm font-medium text-foreground">{t('loginWithGoogle')}</span>
        </button>

        <p className="text-center text-[10px] text-muted-foreground/70 mt-4">
          {t('termsDisclaimer')}{' '}
          <a href="https://www.idapps.com.br/terms" target="_blank" rel="noopener noreferrer" className="underline">
            {t('termsOfUse')}
          </a>{' '}
          {t('and')}{' '}
          <a href="https://www.idapps.com.br/privacy" target="_blank" rel="noopener noreferrer" className="underline">
            {t('privacyPolicy')}
          </a>
        </p>
      </motion.div>
    </div>
  );
}
