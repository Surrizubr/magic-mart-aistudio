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
    
    // Safety check: if 'data' is a string (common if Edge Func returns raw AI text), parse it.
    let finalData = data;
    if (typeof data === 'string') {
      try {
        const cleanJson = data.replace(/```json/g, '').replace(/```/g, '').trim();
        finalData = JSON.parse(cleanJson);
      } catch (e) {
        console.error("Failed to parse Edge Function string as JSON:", data);
        throw new Error("A IA retornou um formato inválido. Tente novamente.");
      }
    }
    
    return finalData;
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

export const RECEIPT_PROMPT = `Você é um scanner de cupons fiscais brasileiros altamente preciso.
Analise a imagem e extraia os dados exatamente no seguinte formato JSON:

{
  "store_name": "Nome da Loja",
  "store_address": "Endereço (opcional)",
  "date": "YYYY-MM-DD",
  "receipt_total": 0.00,
  "items": [
    {
      "product_name": "Nome do Produto",
      "quantity": 1.0,
      "unit": "un",
      "unit_price": 0.00,
      "total_price": 0.00,
      "discount_amount": 0.00,
      "discounted_price": 0.00,
      "category": "Categoria"
    }
  ]
}

REGRAS:
1. "items" DEVE ser um array. Se não houver itens, retorne array vazio.
2. "receipt_total" DEVE ser o valor final pago no cupom.
3. Categorias: Frutas, Verduras, Carnes, Laticínios, Padaria, Bebidas, Limpeza, Higiene, Grãos, Temperos, Outros.
4. Identifique itens duplicados e remova-os.
5. Retorne APENAS o JSON válido, sem qualquer texto adicional antes ou depois.`;

export const PRODUCT_PROMPT = `Você é um assistente de compras. Analise a imagem e identifique o nome do produto e sua categoria (Frutas, Verduras, Carnes, Laticínios, Padaria, Bebidas, Limpeza, Higiene, Grãos, Temperos, Outros). Retorne apenas um JSON: { "product_name": "...", "category": "..." }`;
