import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { toast } from 'sonner';
import { Key, Send, Database, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface DevToolsPageProps {
  onBack: () => void;
}

export function DevToolsPage({ onBack }: DevToolsPageProps) {
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini-api-key') || '');
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'loading' | 'success' | 'error', message: string }>({
    status: 'idle',
    message: ''
  });

  const saveApiKey = () => {
    localStorage.setItem('gemini-api-key', apiKey.trim());
    toast.success('Chave API salva localmente.');
  };

  const clearApiKey = () => {
    localStorage.removeItem('gemini-api-key');
    setApiKey('');
    toast.info('Chave API removida.');
  };

  const testConnectivity = async () => {
    if (!apiKey.trim()) {
      toast.error('Informe a chave API antes de testar.');
      return;
    }

    setTestResult({ status: 'loading', message: 'Testando conexão com Gemini...' });

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      
      const response = await ai.models.generateContent({ 
        model: "gemini-3-flash-preview",
        contents: "Responda apenas com a palavra 'OK' se você estiver recebendo esta mensagem."
      });
      
      const text = response.text || '';

      if (text.includes('OK')) {
        setTestResult({ status: 'success', message: 'Conexão estabelecida com sucesso! A IA respondeu: ' + text });
      } else {
        setTestResult({ status: 'error', message: 'A IA respondeu, mas o conteúdo foi inesperado: ' + text });
      }
    } catch (error: any) {
      console.error('Gemini Test Error:', error);
      setTestResult({ status: 'error', message: 'Erro na conexão: ' + (error.message || 'Erro desconhecido') });
    }
  };

  const checkSubscriptionData = () => {
    const profile = localStorage.getItem('user_profile_personal');
    if (profile) {
      const data = JSON.parse(profile);
      setTestResult({ 
        status: 'success', 
        message: `Perfil encontrado: ${data.display_name} (${data.email}). Status: ${data.subscription_status}` 
      });
    } else {
      setTestResult({ status: 'error', message: 'Perfil de usuário não encontrado no localStorage.' });
    }
  };

  return (
    <div className="pb-20">
      <PageHeader 
        title="Modo Desenvolvedor" 
        subtitle="Ferramentas de diagnóstico e API"
        onBack={onBack}
      />

      <div className="px-4 pt-6 space-y-6">
        {/* API Key Card */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">Configuração Gemini API</h3>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">Sua API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button 
                onClick={clearApiKey}
                className="p-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/20"
                title="Limpar chave"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <button 
            onClick={saveApiKey}
            className="w-full py-2.5 rounded-lg gradient-primary text-primary-foreground font-bold text-sm"
          >
            Salvar Chave
          </button>
        </div>

        {/* Test Actions */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">Ações de Teste</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={testConnectivity}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-accent/30 hover:bg-accent/50 transition-colors gap-2"
            >
              <Send className="w-6 h-6 text-primary" />
              <span className="text-xs font-bold text-center">Testar Conexão IA</span>
            </button>

            <button 
              onClick={checkSubscriptionData}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-accent/30 hover:bg-accent/50 transition-colors gap-2"
            >
              <Database className="w-6 h-6 text-primary" />
              <span className="text-xs font-bold text-center">Ver Dados Perfil</span>
            </button>
          </div>
        </div>

        {/* Results Console */}
        {testResult.status !== 'idle' && (
          <div className={`p-4 rounded-xl border flex gap-3 ${
            testResult.status === 'loading' ? 'bg-accent/20 border-border' :
            testResult.status === 'success' ? 'bg-green-500/10 border-green-500/30' :
            'bg-destructive/10 border-destructive/30'
          }`}>
            {testResult.status === 'loading' ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent animate-spin rounded-full mt-0.5" />
            ) : testResult.status === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            )}
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-tight">Resultado do Diagnóstico</p>
              <p className="text-sm text-foreground break-words">{testResult.message}</p>
            </div>
          </div>
        )}

        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">O Modo Desenvolvedor permite verificar a integridade da conexão direta com os serviços do Google sem passar pelas Edge Functions intermediárias quando possível.</p>
        </div>
      </div>
    </div>
  );
}
