import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';
import { getHistory } from '@/data/mockData';
import { AlertTriangle, Info, MapPin, X, ChevronRight } from 'lucide-react';
import { PurchaseHistory } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function getLevelColor(level: number) {
  switch (level) {
    case 0: return 'bg-primary/20';
    case 1: return 'bg-destructive/60';
    case 2: return 'bg-warning/60';
    case 3: return 'bg-primary/40';
    default: return 'bg-primary/20';
  }
}

function getWeekColor(val: number) {
  if (val === 0) return 'bg-primary/30';
  return 'bg-warning';
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
  const { lang, currency, formatCurrency: fc, t } = useLanguage();
  const allHistory = getHistory();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedWeekDay, setSelectedWeekDay] = useState<number | null>(null);

  const localWeekDays = [
    t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat'), t('sun')
  ];

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

  const closePopup = () => {
    setSelectedDay(null);
    setSelectedWeekDay(null);
  };

  // Determine which stores to show in popup
  const popupOpen = selectedDay !== null || selectedWeekDay !== null;
  const popupStores = selectedDay !== null
    ? getMonthDayStores(selectedDay)
    : selectedWeekDay !== null
      ? getWeekDayStores(selectedWeekDay)
      : [];
  const popupTitle = selectedDay !== null
    ? `${t('day')} ${selectedDay}`
    : selectedWeekDay !== null
      ? localWeekDays[selectedWeekDay]
      : '';

  return (
    <div className="pb-20">
      <PageHeader
        title={t('cheapestDaysTitle')}
        subtitle={t('priceAnalysisByDay')}
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
              <p className="text-xs font-bold text-primary uppercase tracking-wider">{t('potentialSavings')}</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-foreground">{currency}</span>
                <span className="text-sm text-muted-foreground">{t('moreDataWarning')}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-1.5 text-xs text-primary">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>{t('savingsDisclaimer')}</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-primary/80" />
            <span className="text-xs text-muted-foreground">{t('legendVeryCheap')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-primary/40" />
            <span className="text-xs text-muted-foreground">{t('legendCheap')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-warning" />
            <span className="text-xs text-muted-foreground">{t('legendNormal')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-destructive/40" />
            <span className="text-xs text-muted-foreground">{t('legendExpensive')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-destructive/60" />
            <span className="text-xs text-muted-foreground">{t('legendVeryExpensive')}</span>
          </div>
        </div>

        {/* Weekly Heatmap */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-3">{t('weekDaysHeatmap')}</h3>
          <div className="grid grid-cols-7 gap-2">
            {localWeekDays.map((day, i) => (
              <button
                key={i}
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
            <span>{t('lastWeeksCount')} · {t('tapToSeeStores')}</span>
          </div>
        </div>

        {/* Monthly Heatmap */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-3">{t('monthDaysHeatmap')}</h3>
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
            <span>{t('lastMonthsCount')} · {t('tapToSeeStores')}</span>
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
                      {popupStores.length} {popupStores.length === 1 ? t('locationVisited') : t('locationsVisited')}
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
                          {info.count} {info.count === 1 ? t('item') : t('stockItemsCount')} · {fc(info.total)}
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
    </div>
  );
}
