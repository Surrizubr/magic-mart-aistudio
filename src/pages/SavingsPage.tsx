import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';
import { getHistory } from '@/data/mockData';
import { AlertTriangle, Info, MapPin, X, ChevronRight, TrendingDown, TrendingUp, Store, ArrowDown, ArrowUp, LocateFixed, Calendar } from 'lucide-react';
import { PurchaseHistory } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function getLevelColor(level: number) {
  switch (level) {
    case 1: return 'bg-destructive/60';
    case 2: return 'bg-primary/20'; // Caro = Normal = Empty
    case 3: return 'bg-primary/40'; // Barato
    case 4: return 'bg-primary/80'; // Muito Barato
    default: return 'bg-primary/20';
  }
}

function getWeekColor(val: number) {
  if (val === 0) return 'bg-primary/30';
  return 'bg-primary/20'; // Same as empty/normal
}

interface StoreInfo {
  total: number;
  count: number;
  date: string;
}

interface SavingsPageProps {
  onBack?: () => void;
  onNavigateToHistory?: (date: string, store: string) => void;
}

export function SavingsPage({ onBack, onNavigateToHistory }: SavingsPageProps) {
  const { currency, formatCurrency: fc } = useLanguage();
  const allHistory = getHistory();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedWeekDay, setSelectedWeekDay] = useState<number | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<any | null>(null);

  // Use all history — no date filtering, so every purchase appears
  const weekHistory = allHistory;
  const monthHistory = allHistory;

  // Weekly: count unique stores per weekday
  const weekStores: Record<number, Record<string, StoreInfo>> = {};
  weekHistory.forEach(h => {
    const d = new Date(h.purchase_date + 'T12:00:00');
    const day = (d.getDay() + 6) % 7;
    if (!weekStores[day]) weekStores[day] = {};
    const store = h.store_name;
    if (!weekStores[day][store]) {
      weekStores[day][store] = { total: 0, count: 0, date: h.purchase_date };
    }
    weekStores[day][store].total += h.total_price;
    weekStores[day][store].count += 1;
    if (h.purchase_date > weekStores[day][store].date) {
      weekStores[day][store].date = h.purchase_date;
    }
  });

  const weekData = Array.from({ length: 7 }, (_, i) => {
    const stores = weekStores[i] || {};
    return Object.keys(stores).length;
  });

  // Monthly: group by day of month, count unique stores
  const dayPurchases: Record<number, PurchaseHistory[]> = {};
  monthHistory.forEach(h => {
    const d = new Date(h.purchase_date + 'T12:00:00');
    const day = d.getDate();
    (dayPurchases[day] ||= []).push(h);
  });

  const monthData = Array.from({ length: 31 }, (_, i) => {
    const items = dayPurchases[i + 1] || [];
    // Count unique stores
    const uniqueStores = new Set(items.map(h => h.store_name)).size;
    let level = 0;
    if (uniqueStores >= 3) level = 1;
    else if (uniqueStores === 2) level = 2;
    else if (uniqueStores === 1) level = 3;
    return { day: i + 1, level, storeCount: uniqueStores };
  });

  // Get stores for selected month day
  const getMonthDayStores = (day: number) => {
    const items = dayPurchases[day] || [];
    const storeMap: Record<string, StoreInfo> = {};
    items.forEach(h => {
      if (!storeMap[h.store_name]) {
        storeMap[h.store_name] = { total: 0, count: 0, date: h.purchase_date };
      }
      storeMap[h.store_name].total += h.total_price;
      storeMap[h.store_name].count += 1;
      if (h.purchase_date > storeMap[h.store_name].date) {
        storeMap[h.store_name].date = h.purchase_date;
      }
    });
    return Object.entries(storeMap).sort((a, b) => b[1].date.localeCompare(a[1].date));
  };

  // Get stores for selected week day
  const getWeekDayStores = (weekDay: number) => {
    const stores = weekStores[weekDay] || {};
    return Object.entries(stores).sort((a, b) => b[1].date.localeCompare(a[1].date));
  };

  const handleDayClick = (day: number) => {
    if (monthData[day - 1].storeCount > 0) {
      setSelectedDay(day);
      setSelectedWeekDay(null);
    }
  };

  const handleWeekDayClick = (weekDay: number) => {
    if (weekData[weekDay] > 0) {
      setSelectedWeekDay(weekDay);
      setSelectedDay(null);
    }
  };

  const handleStoreClick = (store: string, storeDate: string) => {
    if (onNavigateToHistory) {
      onNavigateToHistory(storeDate, store);
    }
    setSelectedDay(null);
    setSelectedWeekDay(null);
  };

  // Product price variation logic for discounts and increases
  const productVariations = (() => {
    const sorted = [...allHistory].sort((a, b) => a.purchase_date.localeCompare(b.purchase_date));
    const latestVariations: Record<string, { name: string; variation: number; currentPrice: number; prevPrice: number; currentStore: string; prevStore: string; currentDate: string; prevDate: string }> = {};
    const lastPrices: Record<string, number> = {};
    const lastStores: Record<string, string> = {};
    const lastDates: Record<string, string> = {};

    sorted.forEach(item => {
      const name = item.product_name;
      const lowerName = name.toLowerCase();
      const currentPrice = item.price;
      const currentStore = item.store_name;
      const currentDate = item.purchase_date;
      
      if (lastPrices[lowerName] !== undefined) {
        const prevPrice = lastPrices[lowerName];
        const prevStore = lastStores[lowerName];
        const prevDate = lastDates[lowerName];
        if (prevPrice > 0 && Math.abs(currentPrice - prevPrice) > 0.001) {
          latestVariations[lowerName] = {
            name: name,
            variation: ((currentPrice - prevPrice) / prevPrice) * 100,
            currentPrice: currentPrice,
            prevPrice: prevPrice,
            currentStore,
            prevStore,
            currentDate,
            prevDate
          };
        }
      }
      lastPrices[lowerName] = currentPrice;
      lastStores[lowerName] = currentStore;
      lastDates[lowerName] = currentDate;
    });

    const variations = Object.values(latestVariations);
    const discounts = variations
      .filter(v => v.variation < -0.1)
      .sort((a, b) => a.variation - b.variation) // Most negative (best discount) first
      .slice(0, 20);
    
    const increases = variations
      .filter(v => v.variation > 0.1)
      .sort((a, b) => b.variation - a.variation) // Most positive (biggest increase) first
      .slice(0, 20);

    return { discounts, increases };
  })();

  // Cheapest stores calculation
  const cheapestStores = (() => {
    const productPrices: Record<string, { min: number; stores: Record<string, number> }> = {};

    allHistory.forEach(h => {
      const name = h.product_name.toLowerCase();
      const price = h.price;
      const store = h.store_name;

      if (!productPrices[name]) {
        productPrices[name] = { min: price, stores: {} };
      }
      if (price < productPrices[name].min) {
        productPrices[name].min = price;
      }
      productPrices[name].stores[store] = price;
    });

    const storeStats: Record<string, { totalPaid: number; totalMin: number; itemCount: number }> = {};

    Object.values(productPrices).forEach(p => {
      Object.entries(p.stores).forEach(([store, price]) => {
        if (!storeStats[store]) {
          storeStats[store] = { totalPaid: 0, totalMin: 0, itemCount: 0 };
        }
        storeStats[store].totalPaid += price;
        storeStats[store].totalMin += p.min;
        storeStats[store].itemCount += 1;
      });
    });

    return Object.entries(storeStats)
      .map(([name, stats]) => ({
        name,
        score: stats.totalPaid === 0 ? 0 : stats.totalMin / stats.totalPaid,
        savingsPercentage: (1 - (stats.totalPaid === 0 ? 0 : stats.totalMin / stats.totalPaid)) * 100,
        itemCount: stats.itemCount,
        latestDate: allHistory.find(h => h.store_name === name)?.purchase_date || ''
      }))
      .filter(s => s.itemCount > 0)
      .sort((a, b) => b.score - a.score);
  })();

  const closePopup = () => {
    setSelectedDay(null);
    setSelectedWeekDay(null);
    setSelectedVariation(null);
  };

  // Determine which stores to show in popup
  const popupOpen = selectedDay !== null || selectedWeekDay !== null;
  const popupStores = selectedDay !== null
    ? getMonthDayStores(selectedDay)
    : selectedWeekDay !== null
      ? getWeekDayStores(selectedWeekDay)
      : [];
  const popupTitle = selectedDay !== null
    ? `Dia ${selectedDay}`
    : selectedWeekDay !== null
      ? weekDays[selectedWeekDay]
      : '';

  return (
    <div className="pb-20">
      <PageHeader
        title="Economizar"
        subtitle="Análise de preços e economia"
        onBack={onBack}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 space-y-5"
      >
        {/* Savings Card */}
        <div className="bg-accent/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg">🐷</span>
            </div>
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wider">Economia Potencial</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-foreground">{currency}</span>
                <span className="text-sm text-muted-foreground">Necessário mais dados históricos</span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-1.5 text-xs text-primary">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>Valor estimado. A economia real depende de disponibilidade, localização e variações de preço entre lojas.</p>
          </div>
        </div>

        <h3 className="text-sm font-bold text-foreground px-1">Dias Mais Baratos</h3>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-primary/80" />
            <span className="text-xs text-muted-foreground">Muito barato</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-primary/40" />
            <span className="text-xs text-muted-foreground">Barato</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-primary/20" />
            <span className="text-xs text-muted-foreground">Normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-primary/20" />
            <span className="text-xs text-muted-foreground">Caro</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-destructive/60" />
            <span className="text-xs text-muted-foreground">Muito caro</span>
          </div>
        </div>

        {/* Weekly Heatmap */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-3">Dias da Semana</h3>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, i) => (
              <button
                key={day}
                onClick={() => handleWeekDayClick(i)}
                disabled={weekData[i] === 0}
                className="flex flex-col items-center gap-1.5 group"
              >
                <span className="text-[10px] font-medium text-muted-foreground">{day}</span>
                <div className={`w-full aspect-square rounded-lg ${getWeekColor(weekData[i])} flex items-center justify-center transition-transform ${weekData[i] > 0 ? 'cursor-pointer group-hover:scale-110 group-active:scale-95' : ''}`}>
                  {weekData[i] > 0 && <span className="text-xs font-bold text-foreground">{weekData[i]}</span>}
                </div>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
            <Info className="w-3 h-3" />
            <span>Últimas 4 semanas · Toque para ver os locais</span>
          </div>
        </div>

        {/* Monthly Heatmap */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-3">Dias do Mês</h3>
          <div className="grid grid-cols-7 gap-2">
            {monthData.map((d, i) => (
              <button
                key={i}
                onClick={() => handleDayClick(d.day)}
                className="flex flex-col items-center gap-1 group"
                disabled={d.storeCount === 0}
              >
                <span className="text-[10px] text-muted-foreground">{d.day}</span>
                <div className={`w-full aspect-square rounded-lg ${getLevelColor(d.level)} flex items-center justify-center transition-transform ${d.storeCount > 0 ? 'cursor-pointer group-hover:scale-110 group-active:scale-95' : ''}`}>
                  {d.storeCount > 0 && <span className="text-[10px] font-bold text-foreground">{d.storeCount}</span>}
                </div>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
            <Info className="w-3 h-3" />
            <span>Últimos 3 meses · Toque para ver os locais</span>
          </div>
        </div>

        {/* Cheapest Stores List */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-primary" />
              Melhores Locais para Comprar
            </h3>
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Ranking</span>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {cheapestStores.map((store, idx) => (
              <button
                key={store.name}
                onClick={() => handleStoreClick(store.name, store.latestDate)}
                className="w-full flex items-center gap-3 bg-secondary/30 hover:bg-secondary/50 rounded-xl p-3 transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center shrink-0 relative">
                  <Store className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center border-2 border-card">
                    {idx + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{store.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {store.itemCount} produtos monitorados
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">
                    {store.score >= 0.99 ? 'Preço Base' : `${(store.score * 100).toFixed(1)}%`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Índice Economia</p>
                </div>
              </button>
            ))}
            {cheapestStores.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-8">
                Histórico insuficiente para calcular economia por local.
              </p>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground italic leading-relaxed">
              * O Índice de Economia compara os preços pagos em cada local com o menor preço já registrado para os mesmos produtos. 100% indica que o local oferece consistentemente os melhores preços.
            </p>
          </div>
        </div>

        {/* Top Discounts Card */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-500" />
              Produtos com melhores descontos
            </h3>
          </div>
          <div className="max-h-[350px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {productVariations.discounts.map((v) => (
              <button 
                key={v.name} 
                onClick={() => setSelectedVariation(v)}
                className="w-full flex items-center justify-between bg-emerald-50/50 hover:bg-emerald-100/50 rounded-lg p-3 border border-emerald-100 transition-colors text-left group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate group-hover:text-emerald-700 transition-colors">{v.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-[10px] text-muted-foreground font-medium">
                      De: <span className="text-foreground">{fc(v.prevPrice)}</span>
                    </p>
                    <p className="text-[10px] text-emerald-700 font-bold">
                      Para: <span className="text-emerald-800">{fc(v.currentPrice)}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                    <ArrowDown className="w-3 h-3" />
                    {Math.abs(v.variation).toFixed(1)}%
                  </div>
                  <ChevronRight className="w-3 h-3 text-emerald-300 group-hover:text-emerald-500 transition-colors" />
                </div>
              </button>
            ))}
            {productVariations.discounts.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-4">Nenhuma queda de preço detectada recentemente.</p>
            )}
          </div>
        </div>

        {/* Top Increases Card */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-destructive" />
              Produtos com maiores aumentos
            </h3>
          </div>
          <div className="max-h-[350px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {productVariations.increases.map((v) => (
              <button 
                key={v.name} 
                onClick={() => setSelectedVariation(v)}
                className="w-full flex items-center justify-between bg-destructive/5 hover:bg-destructive/10 rounded-lg p-3 border border-destructive/10 transition-colors text-left group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate group-hover:text-destructive transition-colors">{v.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-[10px] text-muted-foreground font-medium">
                      De: <span className="text-foreground">{fc(v.prevPrice)}</span>
                    </p>
                    <p className="text-[10px] text-destructive font-bold">
                      Para: <span className="text-destructive-foreground">{fc(v.currentPrice)}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="text-xs font-bold text-destructive flex items-center gap-0.5">
                    <ArrowUp className="w-3 h-3" />
                    {Math.abs(v.variation).toFixed(1)}%
                  </div>
                  <ChevronRight className="w-3 h-3 text-destructive/30 group-hover:text-destructive/50 transition-colors" />
                </div>
              </button>
            ))}
            {productVariations.increases.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-4">Nenhum aumento significativo detectado.</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Store Popup (shared for week and month) */}
      <AnimatePresence>
        {popupOpen && popupStores.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/40 z-40"
              onClick={closePopup}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              onClick={closePopup}
            >
              <div className="bg-card rounded-2xl border border-border shadow-elevated p-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-bold text-foreground">{popupTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {popupStores.length} local(is) visitado(s)
                    </p>
                  </div>
                  <button
                    onClick={closePopup}
                    className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-secondary-foreground" />
                  </button>
                </div>

                <div className="space-y-2">
                  {popupStores.map(([store, info]) => (
                    <button
                      key={store}
                      onClick={() => handleStoreClick(store, info.date)}
                      className="w-full flex items-center gap-3 bg-secondary/50 hover:bg-secondary rounded-xl p-3 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{store}</p>
                        <p className="text-xs text-muted-foreground">
                          {info.count} {info.count === 1 ? 'item' : 'itens'} · {fc(info.total)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Product Variation Detailed Popup */}
      <AnimatePresence>
        {selectedVariation && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/40 z-40"
              onClick={closePopup}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              onClick={closePopup}
            >
              <div className="bg-card rounded-2xl border border-border shadow-elevated p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h4 className="text-base font-bold text-foreground">{selectedVariation.name}</h4>
                    <p className={`text-xs font-bold ${selectedVariation.variation < 0 ? 'text-emerald-600' : 'text-destructive'} flex items-center gap-1`}>
                      {selectedVariation.variation < 0 ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
                      Variação de {Math.abs(selectedVariation.variation).toFixed(1)}%
                    </p>
                  </div>
                  <button onClick={closePopup} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <X className="w-4 h-4 text-secondary-foreground" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Current Purchase */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-wider">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      Compra Recente
                    </div>
                    <div className={`rounded-xl p-4 space-y-2 ${selectedVariation.variation < 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-destructive/5 border border-destructive/10'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-lg font-bold ${selectedVariation.variation < 0 ? 'text-emerald-700' : 'text-destructive'}`}>
                          {fc(selectedVariation.currentPrice)}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(selectedVariation.currentDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', weekday: 'short' })}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <Store className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="text-xs font-medium text-foreground truncate">{selectedVariation.currentStore}</span>
                        </div>
                        <button 
                          onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedVariation.currentStore)}`, '_blank')}
                          className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          <LocateFixed className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Previous Purchase */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                      Compra Anterior
                    </div>
                    <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-foreground">{fc(selectedVariation.prevPrice)}</span>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(selectedVariation.prevDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', weekday: 'short' })}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <Store className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="text-xs font-medium text-foreground truncate">{selectedVariation.prevStore}</span>
                        </div>
                        <button 
                          onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedVariation.prevStore)}`, '_blank')}
                          className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          <LocateFixed className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <Button onClick={closePopup} className="w-full gradient-primary text-primary-foreground border-0">
                    Fechar Detalhes
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
