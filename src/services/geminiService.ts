import { supabase, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { GoogleGenAI, Type } from "@google/genai";

export async function analyzeWithGemini(images: string[], prompt: string, providedApiKey?: string) {
  try {
    const geminiApiKey = providedApiKey || localStorage.getItem('gemini-api-key') || '';
    if (!geminiApiKey) {
      throw new Error('Chave API não encontrada. Por favor, configure-a no Menu > Configurações.');
    }

    // Use Edge Function ONLY for the Receipt prompt
    if (prompt === RECEIPT_PROMPT) {
      console.log("Using Edge Function for receipt analysis...");
      const { data, error } = await supabase.functions.invoke('analyze-receipt', {
        body: { 
          images, 
          geminiApiKey
        },
        headers: {
          'apikey': SUPABASE_PUBLISHABLE_KEY || ''
        }
      });

      if (error) throw error;
      if (!data.ok) throw new Error(data.error || "Erro desconhecido na análise do cupom");
      return data.data;
    }

    // For other prompts (like direct product recognition), call Gemini directly from the client
    console.log("Using direct Gemini API for product/general analysis...");
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    
    // Prepare image parts
    const imageParts = images.map(img => {
      const matches = img.match(/^data:(.+);base64,(.+)$/);
      return {
        inlineData: {
          mimeType: matches ? matches[1] : "image/jpeg",
          data: matches ? matches[2] : img,
        }
      };
    });

    const isProductPrompt = prompt === PRODUCT_PROMPT;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: prompt }, ...imageParts] },
      config: {
        responseMimeType: "application/json",
        responseSchema: isProductPrompt ? {
          type: Type.OBJECT,
          properties: {
            product_name: { type: Type.STRING },
            category: { type: Type.STRING },
          },
          required: ["product_name", "category"]
        } : undefined
      }
    });

    const text = response.text;

    if (!text) {
      throw new Error("A IA não retornou uma resposta válida.");
    }

    return JSON.parse(text);
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
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
