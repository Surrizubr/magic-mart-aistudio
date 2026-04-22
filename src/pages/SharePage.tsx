import { useState, useEffect } from 'react';
import { ShoppingList } from '@/types';
import { getLists } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Share2, Users, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';

export function SharePage({ onBack }: { onBack: () => void }) {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { fc } = useLanguage();

  useEffect(() => {
    setLists(getLists().filter(l => l.status !== 'archived'));
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleShare = () => {
    // Sharing logic Placeholder
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Compartilhar Listas</h1>
      </header>

      <main className="flex-1 p-6 space-y-8">
        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-foreground">Ajuda em Família</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Compartilhe suas listas para que outras pessoas visualizem ou ajudem você a marcar os itens durante as compras.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
            Selecione as listas que deseja compartilhar:
          </label>
          
          <div className="grid gap-3">
            {lists.map(l => (
              <motion.button
                key={l.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleSelect(l.id)}
                className={`p-4 rounded-xl border flex items-center gap-4 transition-all text-left ${
                  selectedIds.includes(l.id) 
                    ? 'bg-primary/5 border-primary shadow-sm' 
                    : 'bg-card border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                  selectedIds.includes(l.id) ? 'bg-primary border-primary' : 'border-muted-foreground/20'
                }`}>
                  {selectedIds.includes(l.id) && <Check className="w-4 h-4 text-white" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate text-foreground">{l.name}</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                    {l.items.length} itens · {fc(l.estimated_total)}
                  </p>
                </div>
              </motion.button>
            ))}

            {lists.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-muted-foreground/10 rounded-3xl">
                <p className="text-sm text-muted-foreground font-medium italic">Nenhuma lista ativa para compartilhar.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border z-40">
          <Button onClick={handleShare} className="w-full gradient-primary text-white font-bold h-14 rounded-2xl shadow-xl flex items-center justify-center gap-2 max-w-lg mx-auto">
            <Share2 className="w-5 h-5" />
            Compartilhar {selectedIds.length} {selectedIds.length === 1 ? 'lista' : 'listas'}
          </Button>
        </div>
      )}
    </div>
  );
}
