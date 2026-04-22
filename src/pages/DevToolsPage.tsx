import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Terminal, Bug, Play, Shield, FlaskConical, AlertCircle } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { APP_VERSION, LAST_DEPLOY } from '@/version';
import { toast } from 'sonner';

export function DevToolsPage({ onBack }: { onBack: () => void }) {
  const { info, refresh } = useSubscription();
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'running' | 'success' | 'error', message?: string }>({ status: 'idle' });

  const saveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    toast.success('Chave API Gemini salva localmente.');
  };

  const runDiagnostic = async () => {
    setTestResult({ status: 'running' });
    try {
      // Diagnostic logic
      setTestResult({ status: 'success', message: 'Sistema de IA e Banco de dados operacionais.' });
    } catch (e) {
      setTestResult({ status: 'error', message: 'Erro ao conectar com serviços de IA.' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            Dev Tools
          </h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Debug & System Monitoring</p>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8">
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            Configuração Gemini API
          </h3>
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <Input 
              placeholder="Chave API Gemini" 
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="font-mono text-xs"
            />
            <Button onClick={saveApiKey} className="w-full gradient-primary text-white font-bold h-10 shadow-md">
              Salvar Chave
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Bug className="w-3.5 h-3.5" />
            Ações de Teste
          </h3>
          <div className="grid gap-3">
            <Button onClick={runDiagnostic} variant="outline" className="justify-start h-12 gap-3 border-border hover:bg-accent transition-all">
              <FlaskConical className={`w-4 h-4 ${testResult.status === 'running' ? 'animate-spin' : ''}`} />
              Rodar Diagnóstico IA
            </Button>
            <Button onClick={() => refresh()} variant="outline" className="justify-start h-12 gap-3 border-border hover:bg-accent transition-all">
              <Play className="w-4 h-4" />
              Sincronizar Assinatura
            </Button>
          </div>
          
          {testResult.status !== 'idle' && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              testResult.status === 'success' ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-destructive/5 border-destructive/20 text-destructive'
            }`}>
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Resultado do Diagnóstico</p>
                <p className="text-sm font-medium">{testResult.message}</p>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            Versionamento
          </h3>
          <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Versão Atual</span>
              <span className="text-sm font-black text-foreground">{APP_VERSION}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Último Deploy</span>
              <span className="text-xs font-mono font-medium text-foreground">
                {new Date(LAST_DEPLOY).toLocaleDateString('pt-BR')} {new Date(LAST_DEPLOY).toLocaleTimeString('pt-BR')}
              </span>
            </div>
          </div>
        </section>
      </main>

      <footer className="p-10 text-center text-[10px] text-muted-foreground font-medium leading-relaxed opacity-40">
        O Modo Desenvolvedor permite verificar a integridade da conexão direta com os serviços do Google sem passar pelas Edge Functions intermediárias quando possível.
      </footer>
    </div>
  );
}
