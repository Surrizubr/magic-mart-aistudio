import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Camera, Images, X, Loader2, Check, ArrowLeft, Package, MapPin, Trash2, AlertTriangle, Edit2, Plus, History, Eye, Settings, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { analyzeWithGemini, RECEIPT_PROMPT } from '@/services/geminiService';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { recalculateAllConsumptionRates } from '@/lib/consumptionCalculator';
import { getHistory, saveHistory, getStock, saveStock } from '@/data/mockData';

type ScanMode = 'choose' | 'single' | 'multi' | 'history';
type ScanStep = 'capture' | 'processing' | 'results';

interface ReceiptItem {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  discount_amount: number;
  discounted_price: number;
  category: string;
}

interface AIReceiptResult {
  store_name: string;
  store_address?: string;
  date: string;
  items: ReceiptItem[];
  receipt_total: number;
  items_sum: number;
  discounted_sum: number;
  discount?: number;
  difference: number;
  notes?: string;
}

interface ScannerPageProps {
  onBack?: () => void;
  onNavigateToHistory?: (date: string, store: string) => void;
  onOpenMenu?: () => void;
  initialDate?: string;
  initialStore?: string;
}

export function ScannerPage({ onBack, onNavigateToHistory, onOpenMenu, initialDate, initialStore }: ScannerPageProps) {
  const { lang, currency, formatCurrency: fc, t } = useLanguage();
  const [mode, setMode] = useState<ScanMode>('choose');
  const [step, setStep] = useState<ScanStep>('capture');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [mode, step]);

  const [images, setImages] = useState<string[]>([]);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [dateError, setDateError] = useState(false);
  const [result, setResult] = useState<AIReceiptResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [originalDiscounts, setOriginalDiscounts] = useState<Map<string, { discount_amount: number; discounted_price: number; discount: number }>>(new Map());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setMode('choose');
    setStep('capture');
    setImages([]);
    setProgressMsg('');
    setResult(null);
    setSaved(false);
    setEditingItem(null);
    setError(null);
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setImages(prev => {
          const next = [...prev, dataUrl];
          if (mode === 'single') {
            processImages([dataUrl]);
          }
          return next;
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }, [mode]);

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const compressImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max size 1200px
        const max = 1200;
        if (width > height) {
          if (width > max) {
            height *= max / width;
            width = max;
          }
        } else {
          if (height > max) {
            width *= max / height;
            height = max;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Compress with reduced quality (0.7)
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = dataUrl;
    });
  };

  const processImages = async (imgs: string[]) => {
    setStep('processing');
    setProgressPercent(10);
    setProgressMsg(t('optimizeImages'));
    setError(null);

    try {
      const compressedImgs = await Promise.all(imgs.map(img => compressImage(img)));
      
      setProgressPercent(20);
      setProgressMsg(t('sendingImages'));

      const geminiApiKey = localStorage.getItem('gemini-api-key') || '';
      if (!geminiApiKey) {
        setStep('capture');
        setError('API_KEY_ERROR');
        return;
      }

      const resultData = await analyzeWithGemini(compressedImgs, RECEIPT_PROMPT, geminiApiKey);

      setProgressPercent(70);
      setProgressMsg(t('processingResponse'));

      const items: ReceiptItem[] = (resultData.items || []).map((item: any, i: number) => {
        const product_name = item.product_name || item.name || t('unnamedProduct');
        const quantity = Number(item.quantity) || 1;
        const unit_price = Number(item.unit_price || item.price || 0);
        const total_price = Number(item.total_price || (quantity * unit_price) || 0);
        
        return {
          ...item,
          id: `ai-${i + 1}`,
          product_name,
          quantity,
          unit: item.unit || 'un',
          unit_price,
          total_price,
          discount_amount: Number(item.discount_amount || 0),
          discounted_price: Number(item.discounted_price ?? total_price),
          category: item.category || 'Outros',
        };
      });

      const itemsSum = items.reduce((s: number, i: ReceiptItem) => s + i.total_price, 0);
      const discountedSum = items.reduce((s: number, i: ReceiptItem) => s + i.discounted_price, 0);

      // Store original discounts for toggle
      const discountMap = new Map<string, { discount_amount: number; discounted_price: number; discount: number }>();
      items.forEach(item => {
        if (item.discount_amount > 0) {
          discountMap.set(item.id, { 
            discount_amount: item.discount_amount, 
            discounted_price: item.discounted_price, 
            discount: resultData.discount || 0 
          });
        }
      });
      setOriginalDiscounts(discountMap);

      setProgressPercent(100);
      setProgressMsg(t('completingAnalysis'));

      const finalResult: AIReceiptResult = {
        store_name: resultData.store_name || initialStore || t('unknownMarket'),
        store_address: resultData.store_address,
        date: resultData.date || initialDate || new Date().toISOString().slice(0, 10),
        items,
        receipt_total: resultData.receipt_total || 0,
        items_sum: itemsSum,
        discounted_sum: discountedSum,
        discount: resultData.discount,
        difference: Math.abs((resultData.receipt_total || 0) - discountedSum),
        notes: resultData.notes
      };

      setResult(finalResult);
      setStep('results');
    } catch (err: any) {
      console.error('AI analysis error:', err);
      setError('API_KEY_ERROR');
      setStep('capture');
    }
  };

  const handleSave = () => {
    if (!result) return;
    
    // Validate date
    if (!result.date || result.date.trim() === '' || isNaN(new Date(result.date + 'T12:00:00').getTime())) {
      setDateError(true);
      return;
    }
    setDateError(false);

    const receiptId = `receipt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    // Save to purchase_history
    let history = getHistory();
    
    // If we are updating an existing purchase from history page
    if (initialDate && initialStore) {
      const oldItems = history.filter(h => h.purchase_date === initialDate && h.store_name === initialStore);
      
      // "Undo" the previous stock additions
      const stock = getStock();
      oldItems.forEach(oldItem => {
        const stockItem = stock.find(s => s.product_name.toLowerCase() === oldItem.product_name.toLowerCase());
        if (stockItem) {
          stockItem.quantity = Math.max(0, stockItem.quantity - oldItem.quantity);
        }
      });
      saveStock(stock);

      history = history.filter(h => !(h.purchase_date === initialDate && h.store_name === initialStore));
    }

    result.items.forEach(item => {
      history.push({
        id: `h_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        product_name: item.product_name,
        category: item.category,
        quantity: item.quantity,
        price: item.discount_amount > 0 ? item.discounted_price / item.quantity : item.unit_price,
        total_price: item.discount_amount > 0 ? item.discounted_price : item.total_price,
        store_name: result.store_name,
        purchase_date: result.date,
        scanned: true,
        receipt_id: receiptId,
      });
    });
    saveHistory(history);

    // Save to stock_items
    const existingStock: any[] = getStock();
    result.items.forEach(item => {
      const existing = existingStock.find(s => s.product_name.toLowerCase() === item.product_name.toLowerCase());
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        existingStock.push({
          id: `stock_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          product_name: item.product_name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          min_quantity: 1,
          daily_consumption_rate: 0.1,
          status: 'ok',
          last_price: item.discount_amount > 0 ? item.discounted_price / item.quantity : item.unit_price,
          receipt_id: receiptId,
        });
      }
    });
    saveStock(existingStock);

    // Recalculate consumption rates based on purchase history
    recalculateAllConsumptionRates();

    setSaved(true);
  };

  const deleteReceipt = (receiptId: string) => {
    // Remove from purchase_history
    const history = getHistory();
    const filteredHistory = history.filter((h: any) => h.receipt_id !== receiptId);
    saveHistory(filteredHistory);

    // Remove from stock_items (only items that have this receipt_id)
    const stock = getStock();
    const filteredStock = stock.filter((s: any) => s.receipt_id !== receiptId);
    saveStock(filteredStock);
  };

  // Get grouped receipts for history view
  const scannedReceipts = useMemo(() => {
    const history = getHistory();
    const scanned = history.filter((h: any) => h.scanned && h.receipt_id);
    const grouped: Record<string, { receipt_id: string; store_name: string; date: string; items: any[]; total: number }> = {};
    scanned.forEach((item: any) => {
      if (!grouped[item.receipt_id]) {
        grouped[item.receipt_id] = {
          receipt_id: item.receipt_id,
          store_name: item.store_name,
          date: item.purchase_date,
          items: [],
          total: 0,
        };
      }
      grouped[item.receipt_id].items.push(item);
      grouped[item.receipt_id].total += item.total_price;
    });
    return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
  }, [mode]);


  const updateItem = (id: string, field: keyof ReceiptItem, value: string | number) => {
    if (!result) return;
    const newItems = result.items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        updated.total_price = Number(updated.quantity) * Number(updated.unit_price);
        updated.discounted_price = updated.total_price - updated.discount_amount;
      }
      if (field === 'discount_amount') {
        updated.discounted_price = updated.total_price - Number(value);
      }
      return updated;
    });
    const newSum = newItems.reduce((s, i) => s + i.total_price, 0);
    const newDiscountedSum = newItems.reduce((s, i) => s + i.discounted_price, 0);
    setResult({
      ...result,
      items: newItems,
      items_sum: newSum,
      discounted_sum: newDiscountedSum,
      difference: Math.abs(result.receipt_total - newDiscountedSum),
    });
  };

  const removeItem = (id: string) => {
    if (!result) return;
    const newItems = result.items.filter(i => i.id !== id);
    const newSum = newItems.reduce((s, i) => s + i.total_price, 0);
    const newDiscountedSum = newItems.reduce((s, i) => s + i.discounted_price, 0);
    setResult({
      ...result,
      items: newItems,
      items_sum: newSum,
      discounted_sum: newDiscountedSum,
      difference: Math.abs(result.receipt_total - newDiscountedSum),
    });
  };

  const addItem = () => {
    if (!result) return;
    const newId = `ai-new-${Date.now()}`;
    const newItem: ReceiptItem = {
      id: newId,
      product_name: t('newProduct'),
      quantity: 1,
      unit: 'un',
      unit_price: 0,
      total_price: 0,
      discount_amount: 0,
      discounted_price: 0,
      category: 'Outros',
    };
    const newItems = [...result.items, newItem];
    const newSum = newItems.reduce((s, i) => s + i.total_price, 0);
    const newDiscountedSum = newItems.reduce((s, i) => s + i.discounted_price, 0);
    setResult({
      ...result,
      items: newItems,
      items_sum: newSum,
      discounted_sum: newDiscountedSum,
      difference: Math.abs(result.receipt_total - newDiscountedSum),
    });
    setEditingItem(newId);
  };

  // Mode selection screen
  if (mode === 'choose') {
    return (
      <div className="pb-20">
        <PageHeader title={t('scan')} subtitle={t('digitalizeReceipts')} onBack={onBack} />
        <div className="p-4 space-y-4">
          {(() => {
            const hasKey = !!localStorage.getItem('gemini-api-key');
            return (
              <div className={`rounded-lg p-3 flex items-start gap-3 ${hasKey ? 'bg-primary/10' : 'bg-accent/50'}`}>
                {hasKey ? <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <Settings className="w-5 h-5 text-primary shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium">
                    {hasKey ? t('scannerApiKeyConfigured') : t('scannerApiKeyInfo')}
                  </p>
                  <button
                    onClick={() => onOpenMenu?.()} 
                    className="text-sm text-primary font-semibold mt-1 underline underline-offset-2 hover:opacity-80 transition-opacity"
                  >
                    {t('scannerGoToSettings')}
                  </button>
                </div>
              </div>
            );
          })()}

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => {
              if (!localStorage.getItem('gemini-api-key')) {
                toast.error(t('scannerApiKeyInfo'));
                return;
              }
              setMode('single');
            }}
            className="w-full bg-card rounded-lg shadow-card p-5 flex items-center gap-4 text-left hover:shadow-elevated transition-shadow"
          >
            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center shrink-0">
              <Camera className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-card-foreground">{t('singlePhoto')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('singlePhotoDesc')}
              </p>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => {
              if (!localStorage.getItem('gemini-api-key')) {
                toast.error(t('scannerApiKeyInfo'));
                return;
              }
              setMode('multi');
            }}
            className="w-full bg-card rounded-lg shadow-card p-5 flex items-center gap-4 text-left hover:shadow-elevated transition-shadow"
          >
            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shrink-0">
              <Images className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-card-foreground">{t('multiPhoto')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('multiPhotoDesc')}
              </p>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => setMode('history')}
            className="w-full bg-card rounded-lg shadow-card p-5 flex items-center gap-4 text-left hover:shadow-elevated transition-shadow"
          >
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <History className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-card-foreground">{t('scannerHistory')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('scannerHistoryDesc')}
              </p>
            </div>
          </motion.button>

          {/* AI Scanner Info Banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-accent/30 rounded-lg p-4 space-y-2"
          >
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">AI</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {t('aiScannerTitle')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('aiScannerDesc')}
                </p>
              </div>
            </div>

            <div className="border-t border-border/50 pt-3 mt-2">
              <p className="text-xs font-semibold text-foreground mb-2">
                {t('getApiKeyHowTo')}
              </p>
              <ol className="text-xs text-muted-foreground space-y-1.5 pl-4 list-decimal">
                <li>Acesse <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="font-mono text-primary underline">aistudio.google.com/apikey</a></li>
                <li>{t('loginToGoogle')}</li>
                <li>{t('clickCreateKey')}</li>
                <li>{t('copyKey')}</li>
                <li>
                  {t('pasteInSettings')}{' '}
                  <button
                    onClick={() => onOpenMenu?.()}
                    className="text-primary font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity inline"
                  >
                    {t('menu')} → {t('geminiApiKey')}
                  </button>
                </li>
              </ol>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Receipt history screen
  if (mode === 'history') {
    return (
      <div className="pb-20">
        <PageHeader
          title={t('scannerHistory')}
          subtitle={`${scannedReceipts.length} ${t('scannedReceiptsLabel')}`}
          onBack={reset}
        />
        <div className="p-4 space-y-3">
          {scannedReceipts.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <History className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">{t('noReceiptsScanned')}</p>
            </div>
          ) : (
            scannedReceipts.map((receipt) => (
              <motion.div
                key={receipt.receipt_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-lg shadow-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-card-foreground truncate">{receipt.store_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(receipt.date + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {receipt.items.length} {receipt.items.length === 1 ? t('historyItemCount') : t('historyItemsCount')} — {fc(receipt.total)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => onNavigateToHistory?.(receipt.date, receipt.store_name)}
                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {t('seeItems')}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(receipt.receipt_id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-destructive hover:underline"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t('delete')}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Confirmation dialog */}
        <AnimatePresence>
          {confirmDeleteId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setConfirmDeleteId(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-card rounded-xl shadow-elevated p-6 w-full max-w-sm space-y-4"
              >
                <p className="text-sm font-semibold text-card-foreground">{t('deleteReceiptConfirm')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('deleteReceiptDesc')}
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    {t('no')}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      deleteReceipt(confirmDeleteId);
                      setConfirmDeleteId(null);
                      setMode('choose');
                      setTimeout(() => setMode('history'), 0);
                    }}
                  >
                    {t('yesDelete')}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Processing screen
  if (step === 'processing') {
    return (
      <div className="pb-20">
        <PageHeader title={t('scan')} subtitle={t('analyzingWithAI')} />
        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-12 h-12 text-primary" />
          </motion.div>
          <div className="w-full max-w-xs space-y-3">
            <Progress value={progressPercent} className="h-3" />
            <p className="text-sm font-medium text-foreground text-center">{progressMsg}</p>
            <p className="text-xs text-muted-foreground text-center">
              {progressPercent}% {t('completedPercent')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Results screen
  if (step === 'results' && result) {
    const hasDifference = result.difference > 0.01;

    return (
      <div className="pb-20">
        <PageHeader
          title={t('results')}
          subtitle={`${result.items.length} ${t('foundItemsSubtitle')}`}
          onBack={reset}
        />
        <div className="p-4 space-y-4">
          {/* Store & date info */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-lg shadow-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <input
                value={result.store_name}
                onChange={e => setResult({ ...result, store_name: e.target.value })}
                className="text-sm font-semibold text-card-foreground bg-transparent outline-none flex-1 border-b border-transparent focus:border-primary/30"
              />
            </div>

            {result.store_address && (
              <p className="text-xs text-muted-foreground pl-6">{result.store_address}</p>
            )}

            {/* Date */}
            <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">{t('purchaseDateLabel')}</span>
                {result.date === new Date().toISOString().slice(0, 10) ? (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                    {t('dateNotFound')}
                  </span>
                ) : (
                  <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-medium">
                    {t('extractedFromReceipt')}
                  </span>
                )}
              </div>
              <input
                type="date"
                value={result.date}
                onChange={e => { setResult({ ...result, date: e.target.value }); setDateError(false); }}
                className={`w-full p-2 rounded-lg border bg-background text-foreground text-sm outline-none focus:ring-2 ring-primary/30 ${dateError ? 'border-destructive' : 'border-border'}`}
              />
              {dateError && (
                <p className="text-xs text-destructive font-medium">⚠️ {t('fillDateWarning')}</p>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('sumOriginal')}:</span>
                <span className="text-sm font-semibold text-foreground">{fc(result.items_sum)}</span>
              </div>
              {result.discount != null && result.discount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t('discountApplied')}:</span>
                  <span className="text-sm font-semibold text-green-600">- {fc(result.discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('sumWithDiscount')}:</span>
                <span className="text-sm font-bold text-primary">{fc(result.discounted_sum)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-1.5">
                <span className="text-xs font-medium text-foreground">{t('receiptTotalKey')}:</span>
                <span className="text-sm font-bold text-primary">{fc(result.receipt_total)}</span>
              </div>
              {hasDifference && (
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 mt-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-xs text-amber-700 dark:text-amber-400">
                    {t('differenceWarningPrefix')} {fc(result.difference)} {t('differenceWarningSuffix')}
                  </span>
                </div>
              )}
            </div>

            {result.notes && (
              <p className="text-xs text-muted-foreground italic bg-secondary/30 rounded p-2">
                📝 {result.notes}
              </p>
            )}
          </motion.div>

          {/* Top action buttons */}
          {!saved && result.items.length > 0 && (
            <div className="space-y-2">
              <Button
                onClick={handleSave}
                className="w-full gradient-primary text-primary-foreground border-0 h-11"
              >
                <Package className="w-4 h-4 mr-2" />
                {t('saveToStock')}
              </Button>
              {/* Discount toggle buttons */}
              {originalDiscounts.size > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant={result.items.some(i => i.discount_amount > 0) ? "default" : "outline"}
                    onClick={() => {
                      const newItems = result.items.map(item => {
                        const orig = originalDiscounts.get(item.id);
                        if (orig) {
                          return { ...item, discount_amount: orig.discount_amount, discounted_price: orig.discounted_price };
                        }
                        return item;
                      });
                      const origDiscount = Array.from(originalDiscounts.values())[0]?.discount || 0;
                      const newDiscountedSum = newItems.reduce((s, i) => s + i.discounted_price, 0);
                      setResult({
                        ...result,
                        items: newItems,
                        discount: origDiscount,
                        discounted_sum: newDiscountedSum,
                        difference: Math.abs(result.receipt_total - newDiscountedSum),
                      });
                    }}
                    className="flex-1 h-9 text-xs"
                    disabled={result.items.some(i => i.discount_amount > 0)}
                  >
                    ✅ {t('applyDiscounts')}
                  </Button>
                  <Button
                    variant={result.items.every(i => i.discount_amount === 0) ? "default" : "outline"}
                    onClick={() => {
                      const newItems = result.items.map(item => ({
                        ...item,
                        discount_amount: 0,
                        discounted_price: item.total_price,
                      }));
                      const newDiscountedSum = newItems.reduce((s, i) => s + i.discounted_price, 0);
                      setResult({
                        ...result,
                        items: newItems,
                        discount: 0,
                        discounted_sum: newDiscountedSum,
                        difference: Math.abs(result.receipt_total - newDiscountedSum),
                      });
                    }}
                    className="flex-1 h-9 text-xs"
                    disabled={result.items.every(i => i.discount_amount === 0)}
                  >
                    ❌ {t('withoutDiscounts')}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Items */}
          <div className="space-y-2">
            {result.items.map((item, i) => {
              const isEditing = editingItem === item.id;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="bg-card rounded-lg shadow-card p-3"
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        value={item.product_name}
                        onChange={e => updateItem(item.id, 'product_name', e.target.value)}
                        className="text-sm font-medium text-card-foreground bg-background border border-border rounded px-2 py-1.5 w-full outline-none focus:ring-2 ring-primary/30"
                        placeholder={t('productNamePlaceholder')}
                      />
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-muted-foreground">{t('qtyLabel')}</label>
                          <input
                            type="number"
                            step="0.001"
                            value={item.quantity}
                            onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="text-xs bg-background border border-border rounded px-2 py-1.5 w-full outline-none focus:ring-2 ring-primary/30"
                          />
                        </div>
                        <div className="w-16">
                          <label className="text-[10px] text-muted-foreground">{t('unitLabel')}</label>
                          <select
                            value={item.unit}
                            onChange={e => updateItem(item.id, 'unit', e.target.value)}
                            className="text-xs bg-background border border-border rounded px-2 py-1.5 w-full outline-none"
                          >
                            {['un', 'kg', 'lt', 'l', 'ml', 'g', 'pc', 'pct', 'cx', 'dz'].map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-muted-foreground">{t('unitPriceLabel')}</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={e => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="text-xs bg-background border border-border rounded px-2 py-1.5 w-full outline-none focus:ring-2 ring-primary/30"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-muted-foreground">{t('discountLabel')}</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.discount_amount}
                            onChange={e => updateItem(item.id, 'discount_amount', parseFloat(e.target.value) || 0)}
                            className="text-xs bg-background border border-border rounded px-2 py-1.5 w-full outline-none focus:ring-2 ring-primary/30"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="space-y-0.5">
                          <span className="text-xs text-muted-foreground">
                            {t('originalLabel')}: {fc(item.total_price)}
                          </span>
                          {item.discount_amount > 0 && (
                            <span className="text-xs text-green-600 block">
                              {t('withDiscountLabel')}: {fc(item.discounted_price)}
                            </span>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)} className="h-7 text-xs">
                          <Check className="w-3 h-3 mr-1" /> {t('editItemBtn')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-card-foreground">{item.product_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="bg-secondary px-1.5 py-0.5 rounded text-[10px] font-medium">{item.category}</span>
                          <span>{item.quantity} {item.unit}</span>
                          <span>× {fc(item.unit_price)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="text-right">
                          {item.discount_amount > 0 ? (
                            <>
                              <span className="text-xs text-muted-foreground line-through block">{fc(item.total_price)}</span>
                              <span className="text-sm font-bold text-green-600">{fc(item.discounted_price)}</span>
                            </>
                          ) : (
                            <span className="text-sm font-bold text-foreground">{fc(item.total_price)}</span>
                          )}
                        </div>
                        <button onClick={() => setEditingItem(item.id)} className="text-muted-foreground hover:text-primary p-0.5">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive p-0.5">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Add item button */}
          {!saved && (
            <Button variant="outline" onClick={addItem} className="w-full h-10">
              <Plus className="w-4 h-4 mr-2" />
              {t('addItemBtn')}
            </Button>
          )}

          {result.items.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">{t('noneFoundMsg')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('lightingTip')}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2">
            {!saved ? (
              <Button
                onClick={handleSave}
                className="w-full gradient-primary text-primary-foreground border-0 h-11"
                disabled={result.items.length === 0}
              >
                <Package className="w-4 h-4 mr-2" />
                {t('saveToStock')}
              </Button>
            ) : (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-primary/10 rounded-lg p-4 text-center"
              >
                <Check className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-semibold text-primary">{t('saveSuccessful')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.items.length} {t('itemsAddedMsg')}
                </p>
              </motion.div>
            )}
            <Button variant="outline" onClick={reset} className="w-full">
              {t('scanAnotherBtn')}
            </Button>
          </div>
        </div>
      </div>

    );
  }

  // Capture screen
  return (
    <div className="pb-20">
      <PageHeader
        title={mode === 'single' ? t('singlePhoto') : t('multiPhoto')}
        subtitle={mode === 'single' ? t('takePhotoSub') : `${images.length} ${t('photosAddedSub')}`}
        onBack={reset}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={mode === 'multi'}
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="p-4 space-y-4">
        {error === 'API_KEY_ERROR' ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-800 font-semibold">{t('scannerApiKeyWarning')}</p>
              <button
                onClick={() => onOpenMenu?.()} 
                className="text-xs text-amber-900 font-bold mt-1 underline underline-offset-2 hover:opacity-80 transition-opacity flex items-center gap-1"
              >
                <Settings className="w-3 h-3" />
                {t('scannerGoToSettings')}
              </button>
            </div>
            <button onClick={() => setError(null)} className="text-amber-400 hover:text-amber-600">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ) : error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-destructive font-medium">{t('analysisError')}</p>
              <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4 text-destructive" />
            </button>
          </motion.div>
        )}

        {/* Image previews */}
        <AnimatePresence>
          {images.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4"
            >
              {images.map((img, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative shrink-0"
                >
                  <img src={img} alt={`Foto ${i + 1}`} className="w-24 h-32 object-cover rounded-lg shadow-card" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-destructive-foreground" />
                  </button>
                  <span className="absolute bottom-1 left-1 bg-foreground/70 text-background text-[10px] px-1 rounded">
                    {i + 1}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Capture buttons */}
        <div className="space-y-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-card rounded-lg shadow-card p-8 flex flex-col items-center gap-3 border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors"
          >
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center">
              <Camera className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-card-foreground">
                {images.length === 0 ? t('takeReceiptPhoto') : t('addMorePhotos')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('tapToTakeOrGallery')}
              </p>
            </div>
          </button>

          {/* Single Photo Tips Banner */}
          {mode === 'single' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Info className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xs font-bold text-primary uppercase tracking-wider">Dicas para uma boa foto</p>
              </div>
              
              <ol className="space-y-2">
                {[
                  "Coloque o cupom plano em uma mesa",
                  "Escolha um local bem iluminado",
                  "Veja se o cupom está bem legível",
                  "Enquadre todos os itens do cupom (produtos, nome do estabelecimento e data)",
                  "Se o cupom for muito longo, use a opção \"Múltiplas Fotos\" no menu anterior"
                ].map((tip, idx) => (
                  <li key={idx} className="flex gap-2 text-xs text-foreground/80 leading-relaxed">
                    <span className="font-bold text-primary">{idx + 1}.</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ol>
            </motion.div>
          )}

          {mode === 'multi' && (
            <div className="bg-accent/50 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold text-accent-foreground">
                {t('multiPhotoTipTitle')}
              </p>
              <p className="text-xs text-accent-foreground/80">
                {t('multiPhotoTipDesc')}
              </p>
              {images.length > 1 && (
                <p className="text-[10px] text-primary font-medium mt-1">
                  ✅ {images.length} {t('imagesAddedMsg')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Process and cancel buttons */}
        {mode === 'multi' && images.length > 0 && (
          <div className="space-y-2">
            <Button
              onClick={() => processImages(images)}
              className="w-full gradient-primary text-primary-foreground border-0 h-11"
            >
              <Check className="w-4 h-4 mr-2" />
              {t('processMultiWithAI')} ({images.length})
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
