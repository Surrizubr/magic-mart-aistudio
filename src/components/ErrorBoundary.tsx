import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full space-y-8 text-center">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-destructive/10 rounded-full animate-ping" />
              <div className="relative flex items-center justify-center w-24 h-24 bg-destructive/10 rounded-full">
                <AlertCircle className="w-12 h-12 text-destructive" />
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-black text-foreground tracking-tight">Ops! Algo deu errado.</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ocorreu um erro inesperado ao carregar o aplicativo. Tente recarregar ou volte para a página inicial.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="p-4 bg-muted rounded-xl text-left overflow-auto max-h-48 border border-border">
                <p className="text-xs font-mono text-destructive uppercase font-bold mb-2">Debug Info:</p>
                <code className="text-[10px] font-mono text-muted-foreground">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => window.location.reload()} 
                className="gradient-primary text-white font-bold h-12 shadow-lg gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar App
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/'}
                className="h-12 font-bold border-border gap-2"
              >
                <Home className="w-4 h-4" />
                Ir para o Início
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.children;
  }
}
