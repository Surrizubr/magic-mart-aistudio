import { supabase, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

export async function analyzeWithGemini(images: string[], prompt: string, providedApiKey?: string) {
  try {
    // We are now using the Supabase Edge Function 'analyze-receipt' as requested.
    // This offloads the API key management and complex vision logic to the backend.
    const { data, error } = await supabase.functions.invoke('analyze-receipt', {
      body: { 
        images, 
        prompt, 
        // If the user provided a key manually, we pass it so the edge function can use it if desired
        sub_key: providedApiKey || localStorage.getItem('gemini-api-key') || undefined
      },
      headers: {
        'apikey': SUPABASE_PUBLISHABLE_KEY || ''
      }
    });

    if (error) throw error;
    
    // The Edge Function typically returns the parsed JSON directly
    return data;
  } catch (error: any) {
    console.error("Edge Function 'analyze-receipt' Error:", error);
    
    // Fallback error message if the function fails
    const msg = error?.message || "Erro ao processar cupom via Edge Function";
    if (msg.includes("API key")) {
      throw new Error("Chave API do Gemini inválida ou expirada. Verifique suas configurações.");
    }
    throw error;
  }
}

export const RECEIPT_PROMPT = `Você é um scanner de cupons fiscais brasileiros.
Analise a imagem e extraia:
- store_name (nome da loja/mercado)
- date (ISO string YYYY-MM-DD ou null)
- items: array de { name: '...', quantity: '...', price: '...', category: '...' }
- receipt_total: o valor total gasto

Categorias sugeridas: Frutas, Verduras, Carnes, Laticínios, Padaria, Bebidas, Limpeza, Higiene, Grãos, Temperos, Outros.
Tente identificar itens duplicados entre várias fotos e remova-os.
Retorne APENAS um JSON válido.`;

export const PRODUCT_PROMPT = `Você é um assistente de compras. Analise a imagem e identifique o nome do produto e sua categoria (Frutas, Verduras, Carnes, Laticínios, Padaria, Bebidas, Limpeza, Higiene, Grãos, Temperos, Outros). Retorne apenas um JSON: { "product_name": "...", "category": "..." }`;
