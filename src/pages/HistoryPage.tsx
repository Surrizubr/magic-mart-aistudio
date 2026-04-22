import { useState } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';
import { getHistory, saveHistory } from '@/data/mockData';
import { MapPin, ScanLine, Clock, Pencil, LocateFixed, AlertTriangle, Trash2 } from 'lucide-react';
import { SwipeableRow } from '@/components/SwipeableRow';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';

const categoryColors: Record<string, string> = {
  'Grãos': 'bg-accent text-accent-foreground',
  'Laticínios': 'bg-accent text-accent-foreground',
  'Bebidas': 'bg-orange-50 text-orange-700',
  'Frutas': 'bg-green-50 text-green-700',
  'Carnes': 'bg-orange-50 text-orange-700',
  'Limpeza': 'bg-blue-50 text-blue-700',
  'Higiene': 'bg-pink-50 text-pink-700',
  'Padaria': 'bg-amber-50 text-amber-700',
  'Alimentos': 'bg-accent text-accent-foreground',
  'Hortifruti': 'bg-green-50 text-green-700',
};

const categoryIcons: Record<string, string> = {
  'Padaria': '🍞', 'Alimentos': '🛒', 'Higiene': '♥', 'Limpeza': '✨',
  'Bebidas': '🥤', 'Grãos': '🛒', 'Laticínios': '🧀', 'Carnes': '🥩',
  'Frutas': '🍎', 'Hortifruti': '🥬',
};

interface HistoryPageProps {
  onNavigateToScanner?: () => void;
  onBack?: () => void;
  filterDate?: string;
  filterStore?: string;
}

export function HistoryPage({ onNavigateToScanner, onBack, filterDate, filterStore }: HistoryPageProps) {
  const { currency, formatCurrency: fc } = useLanguage();
  const [historyData, setHistoryData] = useState(() => {
    const allHistory = getHistory();
    return filterDate
      ? allHistory.filter(h => h.purchase_date === filterDate && (!filterStore || h.store_name === filterStore))
      : allHistory;
  });
  const totalMonth = historyData.reduce((sum, h) => sum + h.total_price, 0);

  // State for edit address dialog
  const [editingStore, setEditingStore] = useState<{ store: string; date: string } | null>(null);
  const [editAddress, setEditAddress] = useState('');
  const [editDate, setEditDate] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);

  const handleDeleteItem = (itemId: string) => {
    const allHistory = getHistory();
    const updated = allHistory.filter(h => h.id !== itemId);
    saveHistory(updated);
    setHistoryData(prev => prev.filter(h => h.id !== itemId));
  };

  const grouped = historyData.reduce<Record<string, typeof historyData>>((acc, h) => {
    (acc[h.purchase_date] ||= []).push(h);
    return acc;
  }, {});

  const handleEditAddress = (store: string, date: string) => {
    setEditingStore({ store, date });
    setEditAddress(store);
    setEditDate(date);
  };

  const handleGeolocate = async () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
      );
      const { latitude: lat, longitude: lon } = pos.coords;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=18`
      );
      const data = await res.json();
      const addr = data.address || {};
      const commerce = addr.shop || addr.supermarket || addr.mall || addr.marketplace || addr.retail || '';
      const road = addr.road || '';
      const number = addr.house_number || '';
      const parts = [commerce, road, number].filter(Boolean);
      setEditAddress(parts.join(', ') || `${lat.toFixed(5)}, ${lon.toFixed(5)}`);
    } catch {
      // fallback
    } finally {
      setGeoLoading(false);
    }
  };

  const handleSaveAddress = () => {
    if (!editingStore) return;
    const all = getHistory();
    const updated = all.map(h => {
      if (h.purchase_date === editingStore.date && h.store_name === editingStore.store) {
        return { ...h, store_name: editAddress, purchase_date: editDate };
      }
      return h;
    });
    saveHistory(updated);
    setEditingStore(null);
    window.location.reload();
  };

  const formatDate = (dateStr: string) => {
    try {
      // If it's already YYYY-MM-DD, append T12:00 for local time stability
      const baseDate = dateStr.includes('T') ? dateStr : `${dateStr}T12:00`;
      const date = new Date(baseDate);
      if (isNaN(date.getTime())) return 'Data Inválida';
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    } catch {
      return 'Data Inválida';
    }
  };

  return (
    <div className="pb-20">
      <PageHeader
        title="Histórico"
        subtitle={filterDate
          ? `${filterStore || ''} — ${formatDate(filterDate)}`
          : "Suas compras anteriores"
        }
        onBack={onBack}
        action={
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary text-primary text-xs font-medium">
            <Clock className="w-3.5 h-3.5" /> Abr 2026
          </button>
        }
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 space-y-4">
        {/* Scanner button */}
        {onNavigateToScanner && (
          <Button onClick={onNavigateToScanner} className="w-full gradient-primary text-primary-foreground border-0 h-10">
            <ScanLine className="w-4 h-4 mr-2" /> Scanner Cupom
          </Button>
        )}

        {/* Total */}
        <div className="bg-accent/50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-primary">Total do mês</p>
            <p className="text-xs text-muted-foreground">Abril De 2026</p>
          </div>
          <p className="text-2xl font-bold text-primary">{fc(totalMonth)}</p>
        </div>

        {/* Grouped by date */}
        {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([date, items]) => {
          const dayTotal = items.reduce((s, i) => s + i.total_price, 0);
          const byStore = items.reduce<Record<string, typeof items>>((acc, i) => {
            (acc[i.store_name] ||= []).push(i);
            return acc;
          }, {});

          return (
            <div key={date}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-foreground">
                  {formatDate(date)}
                </p>
                <p className="text-sm text-muted-foreground">{fc(dayTotal)}</p>
              </div>

              {Object.entries(byStore).map(([store, storeItems]) => {
                const storeTotal = storeItems.reduce((s, i) => s + i.total_price, 0);
                return (
                  <div key={store} className="mb-3">
                    {/* Store header */}
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-bold text-foreground uppercase">{store}</span>
                        <button
                          onClick={() => handleEditAddress(store, date)}
                          className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-2 hover:text-primary transition-colors"
                        >
                          Editar <Pencil className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{fc(storeTotal)}</span>
                    </div>

                    {/* Scan banner - only show if none of the items in this store group were scanned */}
                    {onNavigateToScanner && !storeItems.some(i => i.scanned) && (
                      <button
                        onClick={onNavigateToScanner}
                        className="w-full flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2 text-left"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-[11px] text-amber-800">
                          Escaneie o cupom fiscal desta compra para completar informações faltantes
                        </span>
                        <ScanLine className="w-4 h-4 text-amber-600 shrink-0 ml-auto" />
                      </button>
                    )}

                    {/* Items */}
                    <div className="space-y-2">
                      {storeItems.map(item => {
                        const catColor = categoryColors[item.category] || 'bg-accent text-accent-foreground';
                        const catIcon = categoryIcons[item.category] || '🛒';
                        return (
                          <SwipeableRow
                            key={item.id}
                            onSwipeLeft={() => handleDeleteItem(item.id)}
                            leftIcon={<Trash2 className="w-5 h-5 text-destructive-foreground" />}
                            leftBg="bg-destructive"
                          >
                            <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 bg-background">
                              <div>
                                <p className="text-sm font-medium text-foreground">{item.product_name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${catColor} flex items-center gap-1`}>
                                    {catIcon} {item.category}
                                  </span>
                                  <span className="text-xs text-muted-foreground">{item.quantity} un</span>
                                </div>
                              </div>
                              <p className="text-sm font-bold text-foreground">{fc(item.total_price)}</p>
                            </div>
                          </SwipeableRow>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </motion.div>

      {/* Edit Address Dialog */}
      <Dialog open={!!editingStore} onOpenChange={(open) => !open && setEditingStore(null)}>
        <DialogContent className="max-w-[90vw] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base">Editar Endereço</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-xs font-medium text-foreground">Local</label>
            <div className="flex gap-2">
              <Input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Nome do local ou endereço"
                className="flex-1 text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleGeolocate}
                disabled={geoLoading}
                className="shrink-0"
              >
                <LocateFixed className={`w-4 h-4 ${geoLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            {geoLoading && (
              <p className="text-xs text-muted-foreground">Obtendo localização...</p>
            )}
            <label className="text-xs font-medium text-foreground">Data da compra</label>
            <Input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStore(null)}>Cancelar</Button>
            <Button onClick={handleSaveAddress}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
