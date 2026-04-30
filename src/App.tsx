import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { DevModeProvider } from "@/contexts/DevModeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { AuthGuard } from "@/components/AuthGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <PreferencesProvider>
            <DevModeProvider>
              <LanguageProvider>
                <SubscriptionProvider>
                  <TooltipProvider>
                    <Toaster position="top-center" />
                    <Router>
                      <AuthGuard>
                        <Routes>
                          <Route path="/" element={<Index />} />
                        </Routes>
                      </AuthGuard>
                    </Router>
                  </TooltipProvider>
                </SubscriptionProvider>
              </LanguageProvider>
            </DevModeProvider>
          </PreferencesProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
