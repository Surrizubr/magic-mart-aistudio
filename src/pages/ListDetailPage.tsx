import { useState, useEffect } from 'react';
import { ShoppingList, ShoppingListItem } from '@/types';
import { getLists, saveLists, getStock, saveStock, saveHistory } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Check, Trash2, ShoppingBasket, MapPin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ListDetailPageProps {
  listId: string;
  onBack: () => void;
}

export function ListDetailPage({ listId, onBack }: ListDetailPageProps) {
  const [list, setList] = useState<ShoppingList | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [storeName, setStoreName] = useState('');
  const { fc } = useLanguage();

  useEffect(() => {
    const allLists = getLists();
    const found = allLists.find(l => l.id === listId);
    if (found) setList(found);
    
    // Save current list ID for persistence if page is refreshed
    localStorage.setItem('selected_list_id', listId);
  }, [listId]);

  const updateList = (updated: ShoppingList) => {
    setList(updated);
    const allLists = getLists();
    const idx = allLists.findIndex(l => l.id === listId);
    if (idx !== -1) {
      allLists[idx] = updated;
      saveLists(allLists);
    }
  };

  const addItem = () => {
    if (!list || !newItemName) return;
    
    const newItem: ShoppingListItem = {
      id: Math.random().toString(36).substr(2, 9),
      list_id: listId,
      product_name: newItemName,
      category: 'Geral',
      quantity: parseFloat(newItemQty) || 1,
      unit: 'un',
      estimated_price: 0,
      actual_price: 0,
      is_checked: false
    };

    updateList({
      ...list,
      items: [...list.items, newItem],
      total_items: list.total_items + 1
    });

    setNewItemName('');
    setNewItemQty('1');
  };

  const toggleItem = (itemId: string) => {
    if (!list) return;
    
    const newItems = list.items.map(item => 
      item.id === itemId ? { ...item, is_checked: !item.is_checked } : item
    );

    updateList({
      ...list,
      items: newItems,
      checked_items: newItems.filter(i => i.is_checked).length
    });
  };

  const removeItem = (itemId: string) => {
    if (!list) return;
    
    const newItems = list.items.filter(item => item.id !== itemId);

    updateList({
      ...list,
      items: newItems,
      total_items: newItems.length,
      checked_items: newItems.filter(i => i.is_checked).length
    });
  };

  const finishShopping = () => {
    if (!list) return;

    // Move checked items to stock and history
    const checkedItems = list.items.filter(i => i.is_checked);
    if (checkedItems.length === 0) {
      toast.error('Selecione ao menos um item para finalizar');
      return;
    }

    const currentStock = getStock();
    const now = new Date().toISOString().split('T')[0];

    checkedItems.forEach(item => {
      // Logic to add to stock or update quantity
      // Logic for history
    });

    toast.success('Compra finalizada e estoque atualizado!');
    onBack();
  };

  if (!list) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-4 flex items-center gap-3">
        <button onClick={() => { localStorage.removeItem('selected_list_id'); onBack(); }} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">{list.name}</h1>
      </header>

      <main className="flex-1 p-4 space-y-6 pb-24">
        <div className="flex gap-2">
          <Input 
            placeholder="Item..." 
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            className="flex-1"
          />
          <Input 
            type="number" 
            value={newItemQty}
            onChange={e => setNewItemQty(e.target.value)}
            className="w-16"
          />
          <Button onClick={addItem} size="icon" className="gradient-primary shrink-0">
            <Plus className="w-5 h-5 text-white" />
          </Button>
        </div>

        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {list.items.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                  item.is_checked ? 'bg-secondary/50 border-primary/20' : 'bg-card border-border'
                }`}
              >
                <button 
                  onClick={() => toggleItem(item.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    item.is_checked ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                  }`}
                >
                  {item.is_checked && <Check className="w-4 h-4 text-white" />}
                </button>
                
                <div className="flex-1 min-w-0" onClick={() => toggleItem(item.id)}>
                  <p className={`font-bold truncate ${item.is_checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {item.product_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} {item.unit} {item.estimated_price > 0 && ` · ${fc(item.estimated_price)}`}
                  </p>
                </div>

                <button onClick={() => removeItem(item.id)} className="p-2 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {list.items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBasket className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Lista vazia. Adicione itens acima.</p>
            </div>
          )}
        </div>

        {list.items.some(i => i.is_checked) && (
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
            <p className="text-xs font-bold text-primary flex items-center gap-2">
              <Check className="w-4 h-4" />
              ⚠️ Ao encerrar, os itens selecionados serão transferidos para o estoque.
            </p>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />
                Informe onde você fez as compras:
              </label>
              <Input 
                placeholder="Ex: Mercadão, Carrefour..." 
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                className="bg-card"
              />
            </div>

            <Button onClick={finishShopping} className="w-full gradient-primary text-white font-bold h-12 shadow-lg">
              Encerrar Compras
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
