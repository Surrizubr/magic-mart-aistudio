import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface WelcomeScreenProps {
  isLoading?: boolean;
  children?: ReactNode;
}

export function WelcomeScreen({ isLoading, children }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-background space-y-12 animate-in fade-in duration-500">
      <div className="text-center space-y-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center mx-auto shadow-2xl relative"
        >
          <span className="text-5xl drop-shadow-md">🌿</span>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
            <span className="text-xs">✨</span>
          </div>
        </motion.div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter text-foreground">Magicmart AI</h1>
          <p className="text-sm text-muted-foreground font-semibold uppercase tracking-[0.2em] opacity-70">
            Sua despensa inteligente
          </p>
        </div>
      </div>

      <div className="w-full max-w-[260px] flex flex-col items-center justify-center min-h-[120px]">
        {isLoading ? (
          <div className="w-full space-y-5 text-center px-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="text-[13px] font-bold text-muted-foreground/80 lowercase tracking-tight">
              carregando a aplicação. Aguarde.
            </p>
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden shadow-inner">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="h-full gradient-primary"
              />
            </div>
          </div>
        ) : (
          <div className="w-full animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            {children}
          </div>
        )}
      </div>
      
      <div className="fixed bottom-8 text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">
        v2.0.4 • secure access
      </div>
    </div>
  );
}
