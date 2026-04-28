import { motion } from 'framer-motion';
import { getStock, getLists, getHistory, saveStock, saveLists } from '@/data/mockData';
import { Plus, ShoppingCart, ScanLine, Share2, Calendar, AlertTriangle, ArrowRight, ChevronRight, ListChecks, Settings, Trash2, Archive, ListTodo } from 'lucide-react';
import { useState } from 'react';
import { TabId, ShoppingList, StockItem } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { SwipeableRow } from '@/components/SwipeableRow';
import { addToReminderList } from '@/lib/reminderList';
import { computeDaysLeft, deriveStatus, sortByCriticality } from '@/lib/stockHelpers';
import { toast } from 'sonner';

interface HomePageProps {
  displayName?: string;
  onNavigate: (tab: TabId) => void;
  onOpenMenu?: () => void;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export function HomePage({ displayName, onNavigate, onOpenMenu }: HomePageProps) {
  const { lang, currency, formatCurrency: fc, t } = useLanguage();
  const [stockState, setStockState] = useState<StockItem[]>(() => getStock());
  const [listsState, setListsState] = useState<ShoppingList[]>(() => getLists());
  const history = getHistory();
  // Sort by criticality (least days left first), only items with <= 3 days
  const criticalStock = sortByCriticality(
    stockState
      .map(s => ({ ...s, status: deriveStatus(s) }))
      .filter(s => s.status === 'critical')
  );
  const activeLists = listsState.filter(l => l.status === 'active' || l.status === 'shopping');
  const totalMonth = history.reduce((sum, h) => sum + h.total_price, 0);

  const handleDeleteList = (id: string) => {
    setListsState(prev => {
      const updated = prev.filter(l => l.id !== id);
      saveLists(updated);
      return updated;
    });
    toast.success(t('listDeleted'));
  };

  const handleArchiveList = (id: string) => {
    setListsState(prev => {
      const updated = prev.map(l => l.id === id ? { ...l, status: 'archived' as const } : l);
      saveLists(updated);
      return updated;
    });
    toast.success(t('listArchived'));
  };

  const handleDeleteAlert = (id: string) => {
    setStockState(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveStock(updated);
      return updated;
    });
    toast.success(t('alertRemoved'));
  };

  const handleAddAlertToReminder = (s: StockItem) => {
    addToReminderList({ product_name: s.product_name, category: s.category, unit: s.unit, last_price: s.last_price });
    setStockState(prev => {
      const updated = prev.filter(x => x.id !== s.id);
      saveStock(updated);
      return updated;
    });
    toast.success(t('addedToShoppingList'));
  };
  const today = new Date();
  const dateStr = today.toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="pb-20">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="px-4 pt-4 pb-3"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <button onClick={onOpenMenu} className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center hover:opacity-90 transition-opacity">
              <Settings className="w-6 h-6 text-primary-foreground" />
            </button>
            <div>
              <p className="text-sm text-muted-foreground">{t('hello')}, {displayName || t('user')} 👋</p>
              <h1 className="text-xl font-bold text-foreground">Magicmart AI</h1>
              <p className="text-xs text-muted-foreground capitalize">{dateStr}</p>
            </div>
          </div>
        </div>
      </motion.header>

      <motion.div variants={container} initial="hidden" animate="show" className="px-4 space-y-5">
        {/* Stats Row */}
        <motion.div variants={item} className="flex gap-3">
          <button onClick={() => onNavigate('stock')} className="flex-1 bg-card rounded-xl border border-border p-3 text-center hover:bg-accent/50 transition-colors">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('stock')}</p>
            <p className="text-2xl font-bold text-foreground">{stockState.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase">{t('items')}</p>
          </button>
          <button onClick={() => onNavigate('lists')} className="flex-1 bg-card rounded-xl border border-primary/30 p-3 text-center hover:bg-accent/50 transition-colors">
            <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">{t('lists')}</p>
            <p className="text-2xl font-bold text-primary">{activeLists.length}</p>
            <p className="text-[10px] text-primary uppercase">{t('active')}</p>
          </button>
          <button onClick={() => onNavigate('history')} className="flex-1 bg-card rounded-xl border border-border p-3 text-center hover:bg-accent/50 transition-colors">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('history')}</p>
            <p className="text-xl font-bold text-foreground">{fc(totalMonth)}</p>
            <p className="text-[10px] text-muted-foreground uppercase">{t('currentMonth')}</p>
          </button>
        </motion.div>

        {/* Action Cards - 2x2 grid */}
        <motion.div variants={item} className="grid grid-cols-2 gap-3">
          {/* Scanner */}
          <button
            onClick={() => onNavigate('scanner')}
            className="gradient-primary rounded-xl p-4 text-left shadow-md flex flex-col"
          >
            <ScanLine className="w-6 h-6 text-primary-foreground mb-4" />
            <p className="text-sm font-bold text-primary-foreground">{t('scan')}</p>
            <p className="text-xs text-primary-foreground/80">{t('receipt')}</p>
          </button>
          {/* Fazer Mercado */}
          <button
            onClick={() => onNavigate('shopping')}
            className="bg-card rounded-xl border border-border p-4 text-left flex flex-col"
          >
            <ShoppingCart className="w-6 h-6 text-primary mb-4" />
            <p className="text-sm font-bold text-foreground">{t('goShopping')}</p>
            <p className="text-xs text-muted-foreground">{t('addProducts')}</p>
          </button>
          {/* Nova Lista */}
          <button
            onClick={() => onNavigate('lists')}
            className="bg-white border border-border rounded-xl p-4 text-left flex flex-col"
          >
            <ListTodo className="w-6 h-6 text-green-600 mb-4" />
            <p className="text-sm font-bold text-foreground">{t('newList')}</p>
            <p className="text-xs text-muted-foreground">{t('createList')}</p>
          </button>
          {/* Compartilhar */}
          <button
            onClick={() => onNavigate('share')}
            className="bg-card rounded-xl border border-border p-4 text-left flex flex-col"
          >
            <Share2 className="w-6 h-6 text-primary mb-4" />
            <p className="text-sm font-bold text-foreground">{t('share')}</p>
            <p className="text-xs text-muted-foreground">{t('activeLists')}</p>
          </button>
        </motion.div>

        {/* Dias mais baratos banner */}
        <motion.div variants={item}>
          <button
            onClick={() => onNavigate('savings')}
            className="w-full rounded-xl p-4 flex items-center justify-between"
            style={{ backgroundColor: 'hsl(48, 100%, 90%)' }}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-yellow-700" />
              <span className="text-sm font-semibold text-yellow-800">{t('cheapDays')}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-yellow-700" />
          </button>
        </motion.div>

        {/* Listas Ativas */}
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">{t('activeListsTitle')}</h2>
            </div>
            <button onClick={() => onNavigate('lists')} className="text-xs text-primary font-medium flex items-center gap-0.5">
              {t('seeAll')} <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {activeLists.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <p className="text-xs text-muted-foreground">{t('noActiveLists')}</p>
            </div>
          ) : (
            <div className="max-h-[280px] overflow-y-auto pr-1 space-y-2" style={{ scrollbarWidth: 'thin' }}>
              {activeLists.slice(0, 5).map(l => (
                <SwipeableRow
                  key={l.id}
                  onSwipeLeft={() => handleDeleteList(l.id)}
                  onSwipeRight={() => handleArchiveList(l.id)}
                  rightIcon={<Archive className="w-5 h-5 text-primary-foreground" />}
                >
                  <button
                    onClick={() => onNavigate('lists')}
                    className="w-full bg-card rounded-xl border border-border p-4 flex items-center gap-3 text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <ListChecks className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{l.items.length} {t('items')} · {fc(l.estimated_total)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                </SwipeableRow>
              ))}
            </div>
          )}
        </motion.div>

        {/* Alertas */}
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">{t('alerts')}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onNavigate('stock')} className="text-xs text-primary font-medium flex items-center gap-0.5">
                {t('seeAll')} <ArrowRight className="w-3 h-3" />
              </button>
              {criticalStock.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {criticalStock.length}
                </span>
              )}
            </div>
          </div>
          {criticalStock.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <p className="text-xs text-muted-foreground">{t('stockUpToDate')}</p>
            </div>
          ) : (
            <div className="max-h-[280px] overflow-y-auto pr-1 space-y-2" style={{ scrollbarWidth: 'thin' }}>
              {criticalStock.slice(0, 5).map(s => {
                const daysLeft = computeDaysLeft(s);
                const isCritical = daysLeft <= 3;
                return (
                  <SwipeableRow
                    key={s.id}
                    onSwipeLeft={() => handleDeleteAlert(s.id)}
                    onSwipeRight={() => handleAddAlertToReminder(s)}
                    rightIcon={<ShoppingCart className="w-5 h-5 text-primary-foreground" />}
                  >
                    <div className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isCritical ? 'bg-destructive/10' : 'bg-warning/10'}`}>
                          <AlertTriangle className={`w-4 h-4 ${isCritical ? 'text-destructive' : 'text-warning'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground uppercase">{s.product_name}</p>
                          <p className={`text-xs font-semibold ${isCritical ? 'text-destructive' : 'text-warning'}`}>~{daysLeft} {t('daysLeft')}</p>
                          <p className="text-xs text-muted-foreground">{t('stock')}: {s.quantity.toLocaleString(lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR', { maximumFractionDigits: 3 })} {t(s.unit)}</p>
                        </div>
                      </div>
                    </div>
                  </SwipeableRow>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Sugestão de dias mais baratos Calendar */}
        <motion.div variants={item} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">{t('suggestedCheapestDaysTitle')}</h2>
          </div>

          <div className="space-y-4">
            {/* Calendar Header: Month and Year */}
            <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-bold text-foreground capitalize">
                {new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR', { month: 'long', year: 'numeric' }).format(new Date())}
              </h3>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-[30px_repeat(7,1fr)] gap-1 px-1">
              {/* Weekday Labels */}
              <div className="text-[10px] font-bold text-muted-foreground flex items-center justify-center">{t('calendarWeekCode')}</div>
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                <div key={i} className="text-[10px] font-bold text-muted-foreground text-center py-1 uppercase">{day}</div>
              ))}

              {/* Calendar Days */}
              {(() => {
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                
                // Helper for week numbers
                const getWeekNumber = (d: Date) => {
                  const date = new Date(d.getTime());
                  date.setHours(0, 0, 0, 0);
                  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
                  const week1 = new Date(date.getFullYear(), 0, 4);
                  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
                };

                const grid = [];
                let currentDay = 1;
                
                // Get cheap days (mocked: usually Tuesdays and Fridays)
                const isCheapDay = (day: number) => {
                  const d = new Date(year, month, day);
                  const dayOfWeek = d.getDay();
                  // Tuesdays (2) and Fridays (5) are usually cheaper according to history
                  return dayOfWeek === 2 || dayOfWeek === 5;
                };

                const isToday = (day: number) => {
                  const d = new Date();
                  return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
                };

                for (let week = 0; week < 6; week++) {
                  if (currentDay > daysInMonth) break;
                  
                  const weekDate = new Date(year, month, currentDay);
                  grid.push(
                    <div key={`wk-${week}`} className="text-[9px] font-mono font-bold text-muted-foreground/60 flex items-center justify-center border-r border-border/50">
                      {getWeekNumber(weekDate)}
                    </div>
                  );

                  for (let i = 0; i < 7; i++) {
                    if ((week === 0 && i < firstDay) || currentDay > daysInMonth) {
                      grid.push(<div key={`empty-${week}-${i}`} />);
                    } else {
                      const dayVal = currentDay;
                      const cheap = isCheapDay(dayVal);
                      const today = isToday(dayVal);
                      grid.push(
                        <div
                          key={`day-${dayVal}`}
                          className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-bold border transition-colors ${
                            today 
                              ? 'bg-blue-500 border-blue-600 text-white shadow-sm ring-2 ring-blue-500/20' 
                              : cheap 
                                ? 'bg-green-600 border-green-700 text-white' 
                                : 'bg-green-100 border-green-200 text-green-800/60'
                          }`}
                        >
                          {dayVal}
                        </div>
                      );
                      currentDay++;
                    }
                  }
                }
                return grid;
              })()}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
