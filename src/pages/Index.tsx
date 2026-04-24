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
  const [navStack, setNavStack] = useState<TabId[]>(['home']);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuInitialSubMenu, setMenuInitialSubMenu] = useState<any>(null);
  const [historyFilter, setHistoryFilter] = useState<{ date?: string; store?: string }>(() => {
    const saved = localStorage.getItem('history_filter');
    return saved ? JSON.parse(saved) : {};
  });

  const activeTab = navStack[navStack.length - 1] || 'home';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('history_filter', JSON.stringify(historyFilter));
  }, [historyFilter]);

  const navigateTo = (tab: TabId) => {
    if (tab === activeTab) return;
    setNavStack(prev => [...prev, tab]);
  };

  const goBack = () => {
    if (navStack.length > 1) {
      setNavStack(prev => prev.slice(0, -1));
    } else if (activeTab !== 'home') {
      setNavStack(['home']);
    }
  };

  const navigateToHistoryFiltered = (date: string, store: string) => {
    setHistoryFilter({ date, store });
    navigateTo('history');
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'home': return <HomePage displayName={info?.display_name || undefined} onNavigate={navigateTo} onOpenMenu={() => setMenuOpen(true)} />;
      case 'lists': return <ListsPage onBack={goBack} />;
      case 'stock': return <StockPage onBack={goBack} />;
      case 'savings': return <SavingsPage onBack={goBack} onNavigateToHistory={navigateToHistoryFiltered} />;
      case 'history': return <HistoryPage onNavigateToScanner={() => navigateTo('scanner')} onBack={() => { setHistoryFilter({}); goBack(); }} filterDate={historyFilter.date} filterStore={historyFilter.store} />;
      case 'reports': return <ReportsPage onBack={goBack} onNavigate={(tab) => navigateTo(tab as TabId)} />;
      case 'scanner': return <ScannerPage onBack={goBack} onNavigateToHistory={navigateToHistoryFiltered} onOpenMenu={() => { setMenuInitialSubMenu('gemini'); setMenuOpen(true); }} />;
      case 'shopping': return <ShoppingPage onNavigate={navigateTo} onBack={goBack} />;
      case 'share': return <SharePage onBack={goBack} />;
      case 'devtools': return <DevToolsPage onBack={goBack} />;
      case 'backup': return <BackupPage onBack={goBack} />;
      default: return <HomePage onNavigate={navigateTo} onOpenMenu={() => setMenuOpen(true)} />;
    }
  };

  const tabOrder: TabId[] = ['home', 'lists', 'stock', 'savings', 'history', 'reports'];

  const handleSwipe = (direction: 'left' | 'right') => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex === -1) return; // Not a swippable tab

    if (direction === 'left' && currentIndex < tabOrder.length - 1) {
      navigateTo(tabOrder[currentIndex + 1]);
    } else if (direction === 'right' && currentIndex > 0) {
      navigateTo(tabOrder[currentIndex - 1]);
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

      <BottomNav activeTab={activeTab} onTabChange={(tab) => { if (tab !== 'history') setHistoryFilter({}); navigateTo(tab); }} />
      <AppMenu open={menuOpen} onClose={() => { setMenuOpen(false); setMenuInitialSubMenu(null); }} initialSubMenu={menuInitialSubMenu} onNavigate={navigateTo} />
    </div>
  );
};

export default Index;
