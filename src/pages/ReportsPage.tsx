import { useState } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';
import { getHistory } from '@/data/mockData';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { TrendingUp, BarChart3, ShoppingCart, Clock, Calendar, MapPin, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const CATEGORY_COLORS = [
  'hsl(152, 60%, 42%)',
  'hsl(38, 90%, 50%)',
  'hsl(210, 70%, 50%)',
  'hsl(340, 60%, 55%)',
  'hsl(270, 50%, 55%)',
  'hsl(0, 70%, 50%)',
  'hsl(190, 70%, 45%)',
  'hsl(25, 80%, 55%)',
  'hsl(160, 50%, 50%)',
];

interface ReportsPageProps {
  onBack?: () => void;
  onNavigate?: (tab: string) => void;
}

export function ReportsPage({ onBack, onNavigate }: ReportsPageProps) {
  const { lang, t, formatCurrency: fc } = useLanguage();
  const history = getHistory();
  const [visitsOpen, setVisitsOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  // Group all history by month for the month picker and evolution chart
  const monthsData = history.reduce<Record<string, { label: string, year: number, month: number, total: number }>>((acc, h) => {
    const d = new Date(h.purchase_date);
    const month = d.getMonth();
    const year = d.getFullYear();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    if (!acc[key]) {
      acc[key] = {
        label: d.toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR', { month: 'short', year: 'numeric' }).replace('.', ''),
        year,
        month,
        total: 0
      };
    }
    acc[key].total += h.total_price;
    return acc;
  }, {});

  const sortedMonthKeys = Object.keys(monthsData).sort().reverse();
  const [selectedMonth, setSelectedMonth] = useState<string>(sortedMonthKeys[0] || '');

  // Filter history based on selected month
  const filteredHistory = selectedMonth 
    ? history.filter(h => h.purchase_date.startsWith(selectedMonth))
    : history;

  // Monthly Evolution Data
  const monthlySpending = Object.entries(monthsData)
    .map(([key, data]) => ({ 
      month: data.label, 
      value: data.total,
      key: key
    }))
    .sort((a, b) => a.key.localeCompare(b.key));

  // 1. Calculations fix
  // Total of the selected month
  const currentMonthTotal = filteredHistory.reduce((sum, h) => sum + h.total_price, 0);
  
  // Average per month calculation
  const totalMonthsCount = Object.keys(monthsData).length;
  const totalSpendAllTime = history.reduce((sum, h) => sum + h.total_price, 0);
  const avgPerMonth = totalMonthsCount > 0 ? totalSpendAllTime / totalMonthsCount : 0;

  // 2. Data for category spending (synced with selected month)
  const productCounts = filteredHistory.reduce<Record<string, number>>((acc, h) => {
    acc[h.product_name] = (acc[h.product_name] || 0) + h.quantity;
    return acc;
  }, {});
  const topProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);

  // Unique visits (store + date) based on filtered history
  const visitEntries = Array.from(new Set(filteredHistory.map(h => `${h.store_name}|${h.purchase_date}`)))
    .map(key => {
      const [store_name, purchase_date] = key.split('|');
      const match = history.find(h => h.store_name === store_name && h.purchase_date === purchase_date);
      return { store_name, purchase_date, store_lat: match?.store_lat, store_lng: match?.store_lng };
    })
    .sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());
  const totalVisits = visitEntries.length;

  // Most visited stores based on filtered history
  const storeCounts = filteredHistory.reduce<Record<string, { count: number; lat?: number; lng?: number }>>((acc, h) => {
    const key = h.store_name;
    if (!acc[key]) acc[key] = { count: 0, lat: h.store_lat, lng: h.store_lng };
    return acc;
  }, {});
  // Recount using filtered unique visits
  visitEntries.forEach(v => {
    if (!storeCounts[v.store_name]) storeCounts[v.store_name] = { count: 0, lat: v.store_lat, lng: v.store_lng };
    storeCounts[v.store_name].count++;
  });
  const topStores = Object.entries(storeCounts)
    .sort((a, b) => b[1].count - a[1].count);

  const openMaps = (name: string, lat?: number, lng?: number) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`, '_blank');
    }
  };

  // Category merge map
  const categoryMerge: Record<string, string> = {
    'Frutas': 'Hortifruti',
    'Verduras': 'Hortifruti',
    'Legumes': 'Hortifruti',
    'Hortifruti': 'Hortifruti',
    'Temperos': 'Alimentos',
    'Grãos': 'Alimentos',
    'Padaria': 'Alimentos',
    'Doces': 'Alimentos',
    'Restaurante': 'Restaurante',
    'Manutenção': 'Manutenção',
  };

  const categoryTotals = filteredHistory.reduce<Record<string, number>>((acc, h) => {
    const merged = categoryMerge[h.category] || h.category;
    acc[merged] = (acc[merged] || 0) + h.total_price;
    return acc;
  }, {});
  const categoryData = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name: t(name), value,
      fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));
  const catTotal = categoryData.reduce((s, c) => s + c.value, 0);
  const enrichedCategories = categoryData.map(c => ({
    ...c,
    percent: catTotal > 0 ? ((c.value / catTotal) * 100).toFixed(1) : '0',
  }));

  const onBarClick = (data: any) => {
    if (data && data.key) {
      setSelectedMonth(data.key);
    }
  };

  return (
    <div className="pb-20">
      <PageHeader
        title={t('reports')}
        subtitle={t('consumptionAnalysis')}
        onBack={onBack}
        action={
          <button 
            onClick={() => setMonthPickerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary text-primary text-xs font-medium"
          >
            <Calendar className="w-3.5 h-3.5" /> 
            {selectedMonth ? monthsData[selectedMonth]?.label : t('all')}
          </button>
        }
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl border border-border p-4">
            <TrendingUp className="w-5 h-5 text-primary mb-2" />
            <p className="text-xl font-bold text-foreground">{fc(currentMonthTotal)}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {selectedMonth ? monthsData[selectedMonth]?.label : t('allMonths')}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <BarChart3 className="w-5 h-5 text-primary mb-2" />
            <p className="text-xl font-bold text-foreground">{fc(avgPerMonth)}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('avgPerMonth')}</p>
          </div>
          <button onClick={() => setVisitsOpen(true)} className="bg-card rounded-xl border border-border p-4 text-left hover:bg-accent/50 transition-colors">
            <ShoppingCart className="w-5 h-5 text-primary mb-2" />
            <p className="text-xl font-bold text-foreground">{totalVisits}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('marketVisits')}</p>
            <p className="text-[10px] text-primary font-medium mt-0.5">{t('seeDetails')}</p>
          </button>
          <div className="bg-card rounded-xl border border-border p-4">
            <Clock className="w-5 h-5 text-muted-foreground mb-2" />
            <p className="text-xl font-bold text-foreground">--</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('estimatedInflation')}</p>
          </div>
        </div>

        {/* Monthly Evolution Bar Chart */}
        {monthlySpending.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-bold text-foreground mb-1">{t('monthlyEvolution')}</h3>
            <p className="text-xs text-muted-foreground mb-3">{t('lastMonths').replace('{count}', String(monthlySpending.length))}</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart 
                data={monthlySpending}
                onClick={(state) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    onBarClick(state.activePayload[0].payload);
                  }
                }}
              >
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(160,10%,45%)' }} axisLine={true} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(160,10%,45%)' }} axisLine={true} tickLine={false} tickFormatter={(v) => fc(v)} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                  formatter={(v: number) => [fc(v), t('spending')]} 
                />
                <Bar 
                  dataKey="value" 
                  radius={[4, 4, 0, 0]} 
                  fill="hsl(152, 60%, 42%)"
                >
                  {monthlySpending.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      cursor="pointer"
                      fill={entry.key === selectedMonth ? 'hsl(152, 60%, 35%)' : 'hsl(152, 60%, 42%)'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {monthlySpending.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-sm text-muted-foreground">{t('noEvolutionData')}</p>
          </div>
        )}

        {/* Donut Chart */}
        {enrichedCategories.length > 0 ? (
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-bold text-foreground mb-4">{t('spendingByCategory')}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={enrichedCategories} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
                  {enrichedCategories.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${fc(v)}`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {enrichedCategories.map(c => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.fill }} />
                    <span className="text-sm text-foreground">{t(c.name)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-foreground">{c.percent}%</span>
                    <span className="text-sm text-muted-foreground">{fc(c.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-sm text-muted-foreground">{t('noCategoryData')}</p>
          </div>
        )}

        {/* Top Products */}
        {topProducts.length > 0 ? (
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-bold text-foreground mb-3">{t('mostPurchased')}</h3>
            <div className="max-h-60 overflow-y-auto pr-2 scrollbar-thin">
              {topProducts.map(([name, count], i) => (
                <div key={name} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-primary bg-accent w-6 h-6 rounded flex items-center justify-center">{i + 1}</span>
                    <span className="text-sm font-medium text-foreground uppercase">{name}</span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{count}x</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-sm text-muted-foreground">{t('noHistoryProducts')}</p>
          </div>
        )}

        {/* Most Visited Stores */}
        {topStores.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-bold text-foreground mb-3">{t('mostVisitedStores')}</h3>
            <div className="max-h-60 overflow-y-auto pr-2 scrollbar-thin">
              {topStores.map(([name, data], i) => (
                <div key={name} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-primary bg-accent w-6 h-6 rounded flex items-center justify-center">{i + 1}</span>
                    <div>
                      <span className="text-sm font-medium text-foreground">{name}</span>
                      <p className="text-[10px] text-muted-foreground">{data.count} {data.count === 1 ? t('visit') : t('visits')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openMaps(name, data.lat, data.lng)}
                    className="p-2 rounded-lg hover:bg-accent/50 transition-colors"
                    title={t('openInMaps')}
                  >
                    <ExternalLink className="w-4 h-4 text-primary" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly Transport Expenses */}
        {(() => {
          const transportByMonth = history.reduce<Record<string, { label: string, total: number }>>((acc, h) => {
            if (h.category !== 'Transporte') return acc;
            const d = new Date(h.purchase_date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!acc[key]) {
              acc[key] = {
                label: d.toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR', { month: 'short', year: 'numeric' }).replace('.', ''),
                total: 0
              };
            }
            acc[key].total += h.total_price;
            return acc;
          }, {});

          const data = Object.entries(transportByMonth)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([key, val]) => ({ month: val.label, value: val.total }));

          if (data.length === 0) return null;

          return (
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-bold text-foreground mb-4">{t('transportMonthly')}</h3>
              <div className="space-y-3">
                {data.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center pb-2 border-b border-border/30 last:border-0 last:pb-0">
                    <span className="text-sm text-muted-foreground capitalize">{item.month}</span>
                    <span className="text-sm font-bold text-foreground">{fc(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Yearly Maintenance Expenses */}
        {(() => {
          const maintenanceByYear = history.reduce<Record<string, number>>((acc, h) => {
            if (h.category !== 'Manutenção') return acc;
            const year = new Date(h.purchase_date).getFullYear().toString();
            acc[year] = (acc[year] || 0) + h.total_price;
            return acc;
          }, {});

          const data = Object.entries(maintenanceByYear)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([year, total]) => ({ year, value: total }));

          if (data.length === 0) return null;

          return (
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-bold text-foreground mb-4">{t('maintenanceYearly')}</h3>
              <div className="space-y-3">
                {data.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center pb-2 border-b border-border/30 last:border-0 last:pb-0">
                    <span className="text-sm text-muted-foreground">{item.year}</span>
                    <span className="text-sm font-bold text-foreground">{fc(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </motion.div>

      {/* Visits Dialog */}
      <Dialog open={visitsOpen} onOpenChange={setVisitsOpen}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              {t('marketVisits')} ({totalVisits})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {visitEntries.map((v, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{v.store_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(v.purchase_date).toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => openMaps(v.store_name, v.store_lat, v.store_lng)}
                  className="p-2 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-primary" />
                </button>
              </div>
            ))}
            {visitEntries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{t('noVisitsRecorded')}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Month Selection Dialog */}
      <Dialog open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {t('selectMonth')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <button
              onClick={() => {
                setSelectedMonth('');
                setMonthPickerOpen(false);
              }}
              className={`w-full p-3 rounded-lg text-left text-sm font-medium transition-colors ${
                selectedMonth === '' ? 'bg-primary text-primary-foreground' : 'bg-accent hover:bg-accent/80 text-foreground'
              }`}
            >
              {t('allMonths')}
            </button>
            {sortedMonthKeys.map(key => (
              <button
                key={key}
                onClick={() => {
                  setSelectedMonth(key);
                  setMonthPickerOpen(false);
                }}
                className={`w-full p-3 rounded-lg text-left text-sm font-medium transition-colors ${
                  selectedMonth === key ? 'bg-primary text-primary-foreground' : 'bg-accent hover:bg-accent/80 text-foreground'
                }`}
              >
                {monthsData[key].label}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
