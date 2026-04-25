import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';
import { getHistory, saveHistory, getLists, saveLists, getStock, saveStock } from '@/data/mockData';
import { MapPin, ScanLine, Clock, Pencil, LocateFixed, AlertTriangle, Trash2, ListPlus, TrendingUp, TrendingDown, FileDown, FileUp, Search, XCircle, RotateCcw, Check } from 'lucide-react';
import { SwipeableRow } from '@/components/SwipeableRow';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { PermissionGate } from '@/components/PermissionGate';

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
  onNavigateToScanner?: (ctx?: { date: string; store: string }) => void;
  onBack?: () => void;
  filterDate?: string;
  filterStore?: string;
}

export function HistoryPage({ onNavigateToScanner, onBack, filterDate, filterStore }: HistoryPageProps) {
  const { lang, currency, formatCurrency: fc, t } = useLanguage();
  const [historyData, setHistoryData] = useState(() => getHistory());
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProduct, setFilteredProduct] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filter history based on all criteria
  const historyDisplay = useMemo(() => {
    let data = [...historyData];
    if (filterDate) {
      data = data.filter(h => h.purchase_date === filterDate && (!filterStore || h.store_name === filterStore));
    }
    if (filteredProduct) {
      data = data.filter(h => h.product_name === filteredProduct);
    } else if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(h => h.product_name.toLowerCase().includes(q));
    }
    return data;
  }, [historyData, filterDate, filterStore, filteredProduct, searchQuery]);

  // Current Month Total (Top Banner) - Should be for the real current month
  const currentMonthTotal = useMemo(() => {
    const now = new Date().toISOString().slice(0, 7);
    return historyData
      .filter(h => h.purchase_date.startsWith(now))
      .reduce((sum, h) => sum + h.total_price, 0);
  }, [historyData]);

  // Totals per month for the list banners
  const monthSums = useMemo(() => {
    const sums: Record<string, number> = {};
    historyDisplay.forEach(h => {
      const month = h.purchase_date.slice(0, 7);
      sums[month] = (sums[month] || 0) + h.total_price;
    });
    return sums;
  }, [historyDisplay]);

  // Product suggestions
  const productSuggestions = useMemo(() => {
    const names = new Set(getHistory().map(h => h.product_name));
    return Array.from(names).sort();
  }, []);

  const filteredSuggestions = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return productSuggestions.filter(p => p.toLowerCase().includes(q)).slice(0, 5);
  }, [searchQuery, productSuggestions]);

  // Pre-calculate price variations using all history
  const { itemVariations, groupVariations } = (() => {
    const all = getHistory();
    const sorted = [...all].sort((a, b) => a.purchase_date.localeCompare(b.purchase_date));
    
    const itemVars: Record<string, number> = {};
    const groupVars: Record<string, number> = {};
    const lastPrices: Record<string, number> = {};
    const groupStats: Record<string, { matchedCurrent: number; matchedPrevious: number }> = {};

    sorted.forEach(item => {
      const name = item.product_name.trim().toLowerCase();
      const currentPrice = item.price;
      const groupKey = `${item.purchase_date}_${item.store_name}`;
      
      if (lastPrices[name] !== undefined) {
        const prevPrice = lastPrices[name];
        if (prevPrice > 0 && Math.abs(currentPrice - prevPrice) > 0.001) {
          itemVars[item.id] = ((currentPrice - prevPrice) / prevPrice) * 100;
        }

        if (!groupStats[groupKey]) groupStats[groupKey] = { matchedCurrent: 0, matchedPrevious: 0 };
        groupStats[groupKey].matchedCurrent += item.quantity * currentPrice;
        groupStats[groupKey].matchedPrevious += item.quantity * prevPrice;
      }
      lastPrices[name] = currentPrice;
    });

    Object.entries(groupStats).forEach(([key, stats]) => {
      if (stats.matchedPrevious > 0) {
        groupVars[key] = ((stats.matchedCurrent - stats.matchedPrevious) / stats.matchedPrevious) * 100;
      }
    });
    
    return { itemVariations: itemVars, groupVariations: groupVars };
  })();

  // State for edit address dialog
  const [editingStore, setEditingStore] = useState<{ store: string; date: string } | null>(null);
  const [editAddress, setEditAddress] = useState('');
  const [editDate, setEditDate] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [showLocationGate, setShowLocationGate] = useState(false);
  
  // Export states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportAllChecked, setExportAllChecked] = useState(false);
  const [exportRange, setExportRange] = useState({ 
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10) 
  });

  const [pendingImportItems, setPendingImportItems] = useState<any[] | null>(null);

  const handleDeleteItem = (itemId: string) => {
    const allHistory = getHistory();
    const updated = allHistory.filter(h => h.id !== itemId);
    saveHistory(updated);
    setHistoryData(prev => prev.filter(h => h.id !== itemId));
  };

  const grouped = historyDisplay.reduce<Record<string, typeof historyData>>((acc, h) => {
    const key = `${h.purchase_date}_${h.store_name}`;
    (acc[key] ||= []).push(h);
    return acc;
  }, {});

  const handleEditAddress = (store: string, date: string) => {
    setEditingStore({ store, date });
    setEditAddress(store);
    setEditDate(date);
  };

  const handleGeolocate = async () => {
    setShowLocationGate(true);
  };

  const executeGeolocate = async () => {
    setShowLocationGate(false);
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

  const handleAddToList = (item: any) => {
    const lists = getLists();
    let reminderList = lists.find(l => l.name === t('reminderListName'));

    const newItem = {
      id: crypto.randomUUID(),
      list_id: '',
      product_name: item.product_name,
      category: item.category,
      quantity: 1,
      unit: 'un',
      estimated_price: item.price,
      actual_price: 0,
      is_checked: false
    };

    if (reminderList) {
      newItem.list_id = reminderList.id;
      reminderList.items.push(newItem);
      reminderList.total_items = reminderList.items.length;
      reminderList.estimated_total = reminderList.items.reduce((sum, i) => sum + (i.estimated_price * i.quantity), 0);
    } else {
      const newListId = crypto.randomUUID();
      newItem.list_id = newListId;
      reminderList = {
        id: newListId,
        name: t('reminderListName'),
        status: 'active',
        total_items: 1,
        checked_items: 0,
        estimated_total: item.price,
        actual_total: 0,
        created_at: new Date().toISOString().slice(0, 10),
        items: [newItem]
      };
      lists.push(reminderList);
    }

    saveLists([...lists]);
    toast.success(`"${item.product_name}" ${t('addedToReminders')}`);
  };

  const formatDate = (dateStr: string) => {
    try {
      const baseDate = dateStr.includes('T') ? dateStr : `${dateStr}T12:00`;
      const date = new Date(baseDate);
      if (isNaN(date.getTime())) return t('invalidDate');
      
      const locale = lang === 'en' ? 'en-US' : (lang === 'es' ? 'es-ES' : 'pt-BR');
      const day = date.getDate();
      const month = date.toLocaleDateString(locale, { month: 'long' });
      const weekday = date.toLocaleDateString(locale, { weekday: 'long' });
      
      // Capitalize properly: "Abril", "Sexta-Feira"
      const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
      
      // For Portuguese weekdays like "sexta-feira", capitalize both parts if requested
      const weekdayCap = weekday.split('-').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join('-');
      
      if (lang === 'pt-BR' || lang === 'es-ES') {
        return `${day} de ${monthCap} (${weekdayCap})`;
      }
      return `${monthCap} ${day} (${weekdayCap})`;
    } catch {
      return t('invalidDate');
    }
  };

  const handleExportCSV = () => {
    const all = getHistory();
    let r = exportRange;
    
    if (exportAllChecked) {
      if (all.length === 0) {
        toast.error(t('noDataFound'));
        return;
      }
      const dates = all.map(h => h.purchase_date).sort();
      r = { start: dates[0], end: dates[dates.length - 1] };
    }

    const filtered = all.filter(h => h.purchase_date >= r.start && h.purchase_date <= r.end);
    
    if (filtered.length === 0) {
      toast.error(t('noDataFound'));
      return;
    }

    const headers = [t('purchaseDateLabel').replace('📅 ', '').replace(':', ''), t('locationLabel'), t('productName'), t('category'), t('quantity'), t('unitPriceLabel'), 'Total'];
    const csvContent = [
      headers.join(','),
      ...filtered.map(h => [
        h.purchase_date,
        `"${h.store_name.replace(/"/g, '""')}"`,
        `"${h.product_name.replace(/"/g, '""')}"`,
        `"${h.category.replace(/"/g, '""')}"`,
        h.quantity,
        h.price,
        h.total_price
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `magic-mart-historico-${r.start}-a-${r.end}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
    toast.success(`${filtered.length} ${t('exportSuccess')}`);
  };


  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) throw new Error(t('invalidFile'));

        const allHistory = getHistory();
        const newItems: any[] = [];
        let skippedCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
          const cleanCols = cols.map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"'));

          if (cleanCols.length < 7) continue;

          const [date, store, product, category, qty, price, total] = cleanCols;

          // Deduplication check
          const exists = allHistory.some(h => 
            h.purchase_date === date && 
            h.store_name === store && 
            h.product_name === product && 
            Math.abs(h.total_price - parseFloat(total)) < 0.01
          );

          if (!exists) {
            newItems.push({
              id: crypto.randomUUID(),
              purchase_date: date,
              store_name: store,
              product_name: product,
              category: category,
              quantity: parseFloat(qty),
              price: parseFloat(price),
              total_price: parseFloat(total),
              scanned: false
            });
          } else {
            skippedCount++;
          }
        }

        if (newItems.length > 0) {
          setPendingImportItems(newItems);
        } else if (skippedCount > 0) {
          toast.info(t('allDataExists'));
        } else {
          toast.error(t('noDataFound'));
        }
      } catch (err) {
        console.error(err);
        toast.error(t('csvFormatError'));
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const confirmImport = async (addToStock: boolean) => {
    if (!pendingImportItems) return;
    
    const allHistory = getHistory();
    const updatedHistory = [...allHistory, ...pendingImportItems];
    await saveHistory(updatedHistory);

    if (addToStock) {
      const stock = getStock();
      pendingImportItems.forEach(item => {
        const existingStock = stock.find(s => s.product_name.toLowerCase() === item.product_name.toLowerCase());
        if (existingStock) {
          existingStock.quantity += item.quantity;
          existingStock.last_price = item.price;
          existingStock.last_purchase = item.purchase_date;
        } else {
          stock.push({
            id: crypto.randomUUID(),
            product_name: item.product_name,
            category: item.category,
            quantity: item.quantity,
            min_quantity: 0,
            unit: 'un',
            last_price: item.price,
            last_purchase: item.purchase_date,
            is_scanned: false
          });
        }
      });
      await saveStock(stock);
    }

    setPendingImportItems(null);
    setHistoryData(updatedHistory);
    toast.success(`${pendingImportItems.length} ${t('importSuccess')}`);
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="pb-20">
      <PermissionGate 
        isOpen={showLocationGate} 
        type="location" 
        onAllow={executeGeolocate} 
        onCancel={() => setShowLocationGate(false)} 
      />
      <PageHeader
        title={t('history')}
        subtitle={filterDate
          ? `${filterStore || ''} — ${formatDate(filterDate)}`
          : t('historySubtitle')
        }
        onBack={onBack}
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 space-y-4">
        {/* Scanner button */}
        {onNavigateToScanner && (
          <div className="space-y-3">
            <Button onClick={onNavigateToScanner} className="w-full gradient-primary text-primary-foreground border-0 h-11 shadow-md">
              <ScanLine className="w-5 h-5 mr-2" /> {t('scanReceiptBtn')}
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={() => document.getElementById('csv-import-input')?.click()}
                className="h-10 bg-card border-border hover:bg-accent transition-colors"
              >
                <FileUp className="w-4 h-4 mr-2 text-primary" /> {t('import') || 'Importar'}
              </Button>
              <input 
                id="csv-import-input" 
                type="file" 
                accept=".csv,text/csv,application/vnd.ms-excel,text/plain" 
                className="hidden" 
                onChange={handleImportCSV}
              />
              
              <Button 
                variant="outline" 
                onClick={() => setShowExportModal(true)}
                className="h-10 bg-card border-border hover:bg-accent transition-colors"
              >
                <FileDown className="w-4 h-4 mr-2 text-primary" /> {t('export') || 'Exportar'}
              </Button>
            </div>

            {/* Search Field */}
            <div className="relative pt-2 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                    if (filteredProduct) setFilteredProduct(null);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder={t('searchPlaceholder')}
                  className="pl-9 pr-9 h-11 bg-card border-border focus:ring-primary/20"
                />
                {searchQuery && (
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setFilteredProduct(null);
                      setShowSuggestions(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    if (filteredSuggestions.length > 0 && !filteredProduct) {
                      setFilteredProduct(filteredSuggestions[0]);
                      setSearchQuery(filteredSuggestions[0]);
                    } else if (searchQuery) {
                      // Just trigger filter with the current query if it matches something
                      const match = productSuggestions.find(p => p.toLowerCase() === searchQuery.toLowerCase());
                      if (match) setFilteredProduct(match);
                    }
                    setShowSuggestions(false);
                  }}
                  className="flex-1 h-10 bg-primary text-primary-foreground font-bold"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {t('search')}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setFilteredProduct(null);
                    setShowSuggestions(false);
                  }}
                  className="flex-1 h-10 bg-card border-border text-muted-foreground"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {t('reset')}
                </Button>
              </div>

              {/* Suggestions dropdown */}
              <AnimatePresence>
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
                  >
                    {filteredSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setFilteredProduct(suggestion);
                          setSearchQuery(suggestion);
                          setShowSuggestions(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-accent flex items-center justify-between group transition-colors"
                      >
                        <span className="font-medium text-foreground">{suggestion}</span>
                        <Check className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="bg-accent/50 rounded-xl p-4 flex items-center justify-between border border-border">
          <div>
            <p className="text-xs font-semibold text-primary">{t('monthTotal')}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {new Date().toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <p className="text-2xl font-bold text-primary">{fc(currentMonthTotal)}</p>
        </div>

        {/* Grouped by date + store */}
        {(() => {
          let lastMonth = '';
          
          return Object.entries(grouped)
            .sort(([keyA], [keyB]) => {
              const [dateA] = keyA.split('_');
              const [dateB] = keyB.split('_');
              return dateB.localeCompare(dateA);
            })
            .map(([key, storeItems], index, arr) => {
              const [date, store] = key.split('_');
              const storeTotal = storeItems.reduce((s, i) => s + i.total_price, 0);
              
              // Month detection (ex: 2026-04)
              const currentMonth = date.slice(0, 7);
              const showMonthDivider = currentMonth !== lastMonth;
              lastMonth = currentMonth;

              const monthLabel = new Date(`${currentMonth}-01T12:00`).toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR', { month: 'long', year: 'numeric' });
              const monthSum = monthSums[currentMonth] || 0;

              return (
                <div key={key} className="relative">
                  {/* Monthly Highlight Divider */}
                  {showMonthDivider && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="py-4"
                    >
                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex-1 h-px bg-gradient-to-r from-emerald-500 to-transparent" />
                        <span className="text-[10px] uppercase tracking-[0.2em] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                          {monthLabel}
                        </span>
                        <div className="flex-1 h-px bg-gradient-to-l from-emerald-500 to-transparent" />
                      </div>
                      <div className="flex justify-center">
                        <div className="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg border border-emerald-500 flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>{t('monthTotal')}: {fc(monthSum)}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Store Separator Line (if not the first item in the month) */}
                  {!showMonthDivider && index > 0 && (
                    <div className="h-px w-full bg-emerald-500/30 my-4" />
                  )}

                  <div className="mb-6">
                    {/* Header for Date and Store */}
                    <div className="flex flex-col mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold text-foreground">
                          {formatDate(date)}
                        </p>
                        <p className="text-xs font-medium text-muted-foreground">{fc(storeTotal)}</p>
                      </div>
                      <div className="pb-2 border-b border-border">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-bold text-foreground uppercase">{store}</span>
                          <button
                            onClick={() => handleEditAddress(store, date)}
                            className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-2 hover:text-primary transition-colors"
                          >
                            {t('editBtn')} <Pencil className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        {groupVariations[key] !== undefined && (
                          <div className={`mt-1 flex items-center flex-wrap gap-1 text-[12px] font-bold ${groupVariations[key] > 0 ? 'text-destructive' : (groupVariations[key] < 0 ? 'text-emerald-600' : 'text-muted-foreground')}`}>
                            {groupVariations[key] > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : (groupVariations[key] < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />)}
                            <span>
                              {groupVariations[key] === 0 
                                ? t('averagePurchase')
                                : `${t('thisPurchaseWas')} ${Math.abs(groupVariations[key]).toFixed(1)}% ${groupVariations[key] > 0 ? t('expensiveLabel') : t('cheaperLabel')} ${t('thanPrevious')}`
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Scan banner - only show if none of the items in this store group were scanned */}
                    {onNavigateToScanner && !storeItems.some(i => i.scanned) && (
                      <button
                        onClick={() => onNavigateToScanner({ date, store })}
                        className="w-full flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2 text-left"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-[11px] text-amber-800">
                          {t('scanReceiptMsg')}
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
                            onSwipeRight={() => handleAddToList(item)}
                            rightIcon={<ListPlus className="w-5 h-5 text-primary-foreground" />}
                            rightBg="bg-primary"
                          >
                            <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 bg-background">
                              <div>
                                <p className="text-sm font-medium text-foreground">{item.product_name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${catColor} flex items-center gap-1`}>
                                    {catIcon} {t(item.category)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">{item.quantity} {t('un')}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-foreground">{fc(item.total_price)}</p>
                                {itemVariations[item.id] !== undefined && (
                                  <div className={`flex items-center justify-end gap-0.5 text-[10px] font-bold ${itemVariations[item.id] > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                                    {itemVariations[item.id] > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                    {Math.abs(itemVariations[item.id]).toFixed(1)}%
                                  </div>
                                )}
                              </div>
                            </div>
                          </SwipeableRow>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            });
        })()}
      </motion.div>

      {/* Edit Address Dialog */}
      <Dialog open={!!editingStore} onOpenChange={(open) => !open && setEditingStore(null)}>
        <DialogContent className="max-w-[90vw] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base">{t('editAddressTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-xs font-medium text-foreground">{t('locationLabel')}</label>
            <div className="flex gap-2">
              <Input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder={t('locationLabel')}
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
              <p className="text-xs text-muted-foreground">{t('gettingLocation')}</p>
            )}
            <label className="text-xs font-medium text-foreground">{t('purchaseDateLabel')}</label>
            <Input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStore(null)}>{t('cancelBtn')}</Button>
            <Button onClick={handleSaveAddress}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportModal} onOpenChange={(open) => {
        setShowExportModal(open);
        if (!open) setExportAllChecked(false);
      }}>
        <DialogContent className="max-w-[90vw] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base">{t('exportHistoryTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">{t('startDate')}</label>
              <Input
                type="date"
                value={exportRange.start}
                onChange={(e) => setExportRange(prev => ({ ...prev, start: e.target.value }))}
                className="text-sm disabled:opacity-50 disabled:bg-muted"
                disabled={exportAllChecked}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">{t('endDate')}</label>
              <Input
                type="date"
                value={exportRange.end}
                onChange={(e) => setExportRange(prev => ({ ...prev, end: e.target.value }))}
                className="text-sm disabled:opacity-50 disabled:bg-muted"
                disabled={exportAllChecked}
              />
              <div className="flex items-center space-x-2 mt-2 pt-1 border-t border-dashed border-muted">
                <Checkbox 
                  id="export-all" 
                  checked={exportAllChecked} 
                  onCheckedChange={(checked) => setExportAllChecked(!!checked)}
                />
                <Label htmlFor="export-all" className="text-xs font-bold text-primary cursor-pointer uppercase">
                  {t('exportAll')}
                </Label>
              </div>
            </div>
            <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
              <p className="text-[10px] text-primary leading-tight">
                {t('exportHint')}
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowExportModal(false)}>{t('cancelBtn')}</Button>
            <Button className="flex-1 gradient-primary text-primary-foreground border-0" onClick={handleExportCSV}>{t('export')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Confirmation Dialog */}
      <Dialog open={!!pendingImportItems} onOpenChange={(open) => !open && setPendingImportItems(null)}>
        <DialogContent className="max-w-[90vw] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base">{t('addImportedToStockTitle')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-foreground">
              {t('addImportedToStockQuestion')}
            </p>
            {pendingImportItems && (
              <p className="text-xs text-muted-foreground mt-2">
                {pendingImportItems.length} {t('items')}
              </p>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => confirmImport(false)}>{t('no')}</Button>
            <Button className="flex-1" onClick={() => confirmImport(true)}>{t('confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
