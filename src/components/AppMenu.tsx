import { useState, useEffect } from 'react';
import { 
  X, ChevronRight, Settings, CreditCard, 
  Globe, Sun, Moon, Info, LogOut, 
  Database, ShieldCheck, HelpCircle, Terminal,
  Trash2, AlertTriangle, Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage, Lang } from '@/contexts/LanguageContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useDevMode } from '@/contexts/DevModeContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { resetAllData } from '@/data/mockData';
import { toast } from 'sonner';

interface AppMenuProps {
  open: boolean;
  onClose: () => void;
  initialSubMenu?: string | null;
}

export function AppMenu({ open, onClose, initialSubMenu }: AppMenuProps) {
  const { t, lang, setLang } = useLanguage();
  const { info, openPortal, openCheckout } = useSubscription();
  const { devMode, setDevMode } = useDevMode();
  const [subMenu, setSubMenu] = useState<string | null>(null);
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [stockExpiryDays, setStockExpiryDays] = useState(() => parseInt(localStorage.getItem('stock_expiry_days') || '30'));
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'running' | 'success' | 'error', message?: string }>({ status: 'idle' });

  useEffect(() => {
    if (initialSubMenu) setSubMenu(initialSubMenu);
    else setSubMenu(null);
  }, [initialSubMenu, open]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  const saveGeminiKey = () => {
    localStorage.setItem('gemini_api_key', geminiKey);
    toast.success(t('geminiApiKeySaved'));
  };

  const menuItems = [
    { id: 'settings', label: t('preferences'), icon: Settings, desc: t('prefDesc') },
    { id: 'subscription', label: t('payment'), icon: CreditCard, desc: t('paymentDesc') },
    { id: 'language', label: t('languages'), icon: Globe, desc: t('langDesc') },
    { id: 'gemini', label: t('geminiApiKey'), icon: Key, desc: t('geminiApiKeyDesc') },
    { id: 'about', label: t('about'), icon: Info, desc: t('aboutDesc') },
  ];

  const renderSubMenu = () => {
    switch (subMenu) {
      case 'settings':
        return (
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('stockExpiry')}</label>
              <div className="space-y-6">
                <Slider 
                  value={[stockExpiryDays]} 
                  onValueChange={v => { setStockExpiryDays(v[0]); localStorage.setItem('stock_expiry_days', v[0].toString()); }}
                  max={120} min={7} step={1}
                />
                <div className="flex justify-between text-xs font-bold text-foreground">
                  <span>7 {t('days')}</span>
                  <span className="text-primary bg-primary/10 px-2 py-1 rounded-md">{stockExpiryDays} {t('days')}</span>
                  <span>120 {t('days')}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              <Button 
                variant="outline" 
                onClick={() => { if(confirm(t('confirmReset'))) resetAllData(); }}
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20 gap-3 h-12"
              >
                <Trash2 className="w-4 h-4" />
                <div className="text-left">
                  <p className="text-sm font-bold leading-none mb-1">{t('resetAll')}</p>
                  <p className="text-[10px] opacity-60 font-medium">{t('resetDesc')}</p>
                </div>
              </Button>
            </div>
          </div>
        );
      case 'gemini':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('geminiApiKeyDesc')}
              </p>
              <div className="flex gap-2">
                <Input 
                  value={geminiKey} 
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder={t('geminiPlaceholder')}
                  className="font-mono text-xs"
                />
                <Button onClick={saveGeminiKey} className="gradient-primary text-white font-bold">
                  {t('geminiSave')}
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-foreground">{t('geminiHelpTitle')}</h4>
              <p className="text-[11px] text-muted-foreground whitespace-pre-line leading-relaxed">
                {t('geminiHelpSteps')}
              </p>
              <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-bold underline flex items-center gap-1">
                Acessar AI Studio <ChevronRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        );
      case 'subscription':
        return (
          <div className="space-y-4">
            <Button onClick={() => openCheckout()} className="w-full gradient-primary text-white h-12 font-bold shadow-lg">
              {t('renew')}
            </Button>
            <Button variant="outline" onClick={() => openPortal()} className="w-full h-12 font-bold border-border">
              {t('paymentDesc')}
            </Button>
          </div>
        );
      case 'language':
        return (
          <div className="grid gap-2">
            {(['pt', 'en', 'es'] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`p-4 rounded-xl border flex items-center justify-between font-bold transition-all ${
                  lang === l ? 'bg-primary/5 border-primary text-primary' : 'bg-card border-border'
                }`}
              >
                {l === 'pt' ? 'Português' : l === 'en' ? 'English' : 'Español'}
                {lang === l && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        );
      case 'about':
        return (
          <div className="space-y-6">
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                <span className="text-3xl">🌿</span>
              </div>
              <h3 className="text-xl font-black text-foreground">Magicmart AI</h3>
              <p className="text-xs text-muted-foreground font-medium italic">Sua despensa inteligente</p>
            </div>
            
            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('developedBy')}<br />
                {t('termsText')}
              </p>
              <div className="flex gap-4">
                <a href="https://idapps.com.br/privacy" target="_blank" className="text-[10px] font-black uppercase text-primary tracking-widest underline">Privacidade</a>
                <a href="https://idapps.com.br/terms" target="_blank" className="text-[10px] font-black uppercase text-primary tracking-widest underline">Termos</a>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if(!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-[320px] bg-background h-full shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-black text-foreground">{subMenu ? menuItems.find(m => m.id === subMenu)?.label : t('menu')}</h2>
            {!subMenu && <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{info?.email}</p>}
          </div>
          <button onClick={onClose} className="p-2 -mr-2 bg-secondary/50 rounded-full text-foreground hover:bg-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <AnimatePresence mode="wait">
            {!subMenu ? (
              <motion.div 
                key="main"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-1.5"
              >
                {menuItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSubMenu(item.id)}
                    className="w-full p-4 rounded-2xl flex items-center gap-4 hover:bg-muted/50 transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                  </button>
                ))}

                <div className="pt-8 space-y-1.5">
                  <button onClick={handleLogout} className="w-full p-4 rounded-2xl flex items-center gap-4 text-destructive hover:bg-destructive/5 transition-colors text-left group">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                      <LogOut className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{t('logout')}</p>
                      <p className="text-[11px] opacity-60 truncate">{t('logoutDesc')}</p>
                    </div>
                  </button>

                  {devMode && (
                    <button 
                      onClick={() => { setDevMode(false); onClose(); }} 
                      className="w-full p-4 mt-4 rounded-xl border border-warning/30 bg-warning/5 text-warning flex items-center gap-3 text-left"
                    >
                      <ShieldCheck className="w-5 h-5" />
                      <div>
                        <p className="text-xs font-bold leading-none mb-1">Desativar Modo Dev</p>
                        <p className="text-[10px] font-medium opacity-70">Voltar ao fluxo normal</p>
                      </div>
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="sub"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <button 
                  onClick={() => setSubMenu(null)}
                  className="mb-6 flex items-center gap-2 text-xs font-black uppercase text-primary tracking-widest hover:opacity-70 transition-opacity"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Voltar ao Menu
                </button>
                {renderSubMenu()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 border-t border-border bg-muted/10 text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
            Magicmart AI • v1.0.6
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      strokeWidth={3}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
