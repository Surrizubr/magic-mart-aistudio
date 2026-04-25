import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { StockItem } from '@/types';

const categories = [
  'Laticínios', 'Grãos', 'Bebidas', 'Temperos', 'Limpeza',
  'Carnes', 'Frutas', 'Alimentos', 'Higiene', 'Hortifruti', 'Padaria',
  'Transporte', 'Outros',
];

const units = ['un', 'kg', 'g', 'L', 'ml', 'pct', 'cx'];

export interface AddStockItemResult extends StockItem {
  price: number;
}

interface AddStockItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: AddStockItemResult) => void;
}

export function AddStockItemDialog({ open, onOpenChange, onAdd }: AddStockItemDialogProps) {
  const { t, currency } = useLanguage();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Alimentos');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('un');
  const [minQuantity, setMinQuantity] = useState('1');
  const [price, setPrice] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    const totalPrice = Math.max(0, Number(price) || 0);
    const qty = Math.max(0, Number(quantity) || 1);
    const unitPrice = qty > 0 ? totalPrice / qty : totalPrice;
    const item: AddStockItemResult = {
      id: crypto.randomUUID(),
      product_name: name.trim(),
      category,
      quantity: qty,
      unit,
      min_quantity: Math.max(0, Number(minQuantity) || 1),
      daily_consumption_rate: 0,
      status: 'ok',
      last_price: unitPrice,
      price: totalPrice,
    };
    onAdd(item);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setName('');
    setCategory('Alimentos');
    setQuantity('1');
    setUnit('un');
    setMinQuantity('1');
    setPrice('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-[90vw] sm:max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle>{t('addStockItem')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('productName')}</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('productNamePlaceholder')}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t('category')}</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{t(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t('unit')}</label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {units.map(u => (
                    <SelectItem key={u} value={u}>{t(u)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t('quantity')}</label>
              <Input type="number" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t('minQuantity')}</label>
              <Input type="number" min="0" value={minQuantity} onChange={e => setMinQuantity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t('price')} total ({currency})</label>
              <Input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>{t('cancel')}</Button>
          <Button onClick={handleAdd} disabled={!name.trim()}>{t('addItem')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
