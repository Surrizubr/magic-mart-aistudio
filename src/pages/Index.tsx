import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSubscription } from '@/hooks/useSubscription';
import { RenewalBanner } from '@/components/RenewalBanner';
import { BottomNav } from '@/components/BottomNav';
import { AppMenu } from '@/components/AppMenu';
import { HomePage } from '@/pages/HomePage';
import { ListsPage } from '@/pages/ListsPage';
import { StockPage } from '@/pages/StockPage';
import { SavingsPage } from '@/pages/SavingsPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { ScannerPage } from '@/pages/ScannerPage';
import { ShoppingPage } from '@/pages/ShoppingPage';
import { SharePage } from '@/pages/SharePage';
import { DevToolsPage } from '@/pages/DevToolsPage';
import { BackupPage } from '@/pages/BackupPage';
import { TabId } from '@/types';

const Index = () => {
  const { info } = useSubscription();
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuInitialSubMenu, setMenuInitialSubMenu] = useState<any>(null);
  const [historyFilter, setHistoryFilter] = useState<{ date?: string; store?: string }>(() => {
    const saved = localStorage.getItem('history_filter');
    return saved ? JSON.parse(saved) : {};
  });

  // Removed activeTab persistence as per user request to always start on Home

  useEffect(() => {
    localStorage.setItem('history_filter', JSON.stringify(historyFilter));
  }, [historyFilter]);

  const goHome = () => setActiveTab('home');

  const navigateToHistoryFiltered = (date: string, store: string) => {
    setHistoryFilter({ date, store });
    setActiveTab('history');
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'home': return <HomePage displayName={info?.display_name || undefined} onNavigate={setActiveTab} onOpenMenu={() => setMenuOpen(true)} />;
      case 'lists': return <ListsPage onBack={goHome} />;
      case 'stock': return <StockPage onBack={goHome} />;
      case 'savings': return <SavingsPage onBack={goHome} onNavigateToHistory={navigateToHistoryFiltered} />;
      case 'history': return <HistoryPage onNavigateToScanner={() => setActiveTab('scanner')} onBack={() => { setHistoryFilter({}); goHome(); }} filterDate={historyFilter.date} filterStore={historyFilter.store} />;
      case 'reports': return <ReportsPage onBack={goHome} onNavigate={(tab) => setActiveTab(tab as TabId)} />;
      case 'scanner': return <ScannerPage onBack={goHome} onNavigateToHistory={navigateToHistoryFiltered} onOpenMenu={() => { setMenuInitialSubMenu('gemini'); setMenuOpen(true); }} />;
      case 'shopping': return <ShoppingPage onNavigate={setActiveTab} onBack={goHome} />;
      case 'share': return <SharePage onBack={goHome} />;
      case 'devtools': return <DevToolsPage onBack={goHome} />;
      case 'backup': return <BackupPage onBack={goHome} />;
    }
  };

  const tabOrder: TabId[] = ['home', 'lists', 'stock', 'savings', 'history', 'reports'];

  const handleSwipe = (direction: 'left' | 'right') => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex === -1) return; // Not a swippable tab

    if (direction === 'left' && currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    } else if (direction === 'right' && currentIndex > 0) {
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative overflow-x-hidden">
      <RenewalBanner />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            const threshold = 50;
            if (info.offset.x < -threshold) handleSwipe('left');
            else if (info.offset.x > threshold) handleSwipe('right');
          }}
          className="touch-pan-y"
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>

      <BottomNav activeTab={activeTab} onTabChange={(tab) => { if (tab !== 'history') setHistoryFilter({}); setActiveTab(tab); }} />
      <AppMenu open={menuOpen} onClose={() => { setMenuOpen(false); setMenuInitialSubMenu(null); }} initialSubMenu={menuInitialSubMenu} onNavigate={setActiveTab} />
    </div>
  );
};

export default Index;
