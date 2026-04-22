import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface WelcomeScreenProps {
  isLoading?: boolean;
  children?: ReactNode;
}

export function WelcomeScreen({ isLoading, children }: WelcomeScreenProps) {
  return (
    <div className="fixed inset-0 w-full h-screen flex flex-col items-center justify-center overflow-hidden bg-[#f0f4f0]">
      {/* Presentation Image as background */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/app_presentation.png" 
          alt="Presentation"
          className="w-full h-full object-cover lg:object-contain" // Contain on large to preserve aspect ratio, cover on mobile
          onError={(e) => {
            console.error("Presentation image failed to load");
          }}
          referrerPolicy="no-referrer"
        />
        {/* Subtle overlay to soften the image and improve text/button contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-transparent z-10" />
      </div>

      {/* Content strictly at the bottom */}
      <div className="relative z-20 w-full max-w-sm h-full flex flex-col justify-end items-center pb-20 px-8">
        {isLoading ? (
          <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="text-sm font-semibold text-center text-[#2D5A27] drop-shadow-sm tracking-tight bg-white/30 backdrop-blur-sm py-1 rounded-full">
              carregando a aplicação. Aguarde.
            </p>
            <div className="w-full h-1.5 bg-slate-200/50 backdrop-blur-md rounded-full overflow-hidden border border-white/20 shadow-sm">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="h-full w-1/2 bg-[#2D5A27] rounded-full" 
              />
            </div>
          </div>
        ) : (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
