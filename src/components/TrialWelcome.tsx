import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Sparkles, ShoppingCart, Database, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export function TrialWelcome() {
  const [open, setOpen] = useState(false);
  const { currency } = useLanguage();

  useEffect(() => {
    const hasSeen = localStorage.getItem('has_seen_welcome');
    if (!hasSeen) {
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const close = () => {
    localStorage.setItem('has_seen_welcome', '1');
    setOpen(false);
  };

  const features = [
    { icon: ShoppingCart, title: 'Listas Inteligentes', desc: 'Sincronização em tempo real' },
    { icon: Database, title: 'Controle de Estoque', desc: 'Previsão de consumo' },
    { icon: PieChart, title: 'Relatórios Mensais', desc: 'Veja onde economizar' },
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-background border border-border rounded-[32px] overflow-hidden shadow-2xl"
          >
            <div className="p-8 space-y-8">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center mx-auto shadow-xl shadow-primary/20">
                  <span className="text-4xl text-white">🌿</span>
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-foreground">Magicmart AI</h2>
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                    Seu assistente inteligente de compras e controle de estoque doméstico
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {features.map((f, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-secondary/50">
                    <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-primary shrink-0 shadow-sm">
                      <f.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground leading-none mb-1">{f.title}</p>
                      <p className="text-[11px] text-muted-foreground font-medium">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Oferta de Lançamento</p>
                  <p className="text-2xl font-black text-foreground">{currency} 49,90/ano</p>
                  <p className="text-[11px] font-bold text-muted-foreground">Menos de {currency} 4,16 por mês</p>
                </div>
                <Button onClick={close} className="w-full gradient-primary text-white font-bold h-14 rounded-2xl shadow-xl">
                  Começar a Usar
                </Button>
              </div>
            </div>
            
            <button onClick={close} className="absolute top-4 right-4 p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
