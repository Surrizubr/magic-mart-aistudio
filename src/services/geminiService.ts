import { GoogleGenerativeAI } from "@google/generative-ai";

export async function analyzeWithGemini(images: string[], prompt: string, apiKey: string) {
  if (!apiKey) throw new Error("Gemini API Key missing");

  const genAI = new GoogleGenerativeAI(apiKey);
  // Reverting to the most standard model name. If this fails, the error will be caught.
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const imageParts = images.map(img => {
    const [header, data] = img.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
    return {
      inlineData: {
        data,
        mimeType
      }
    };
  });

  try {
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();
    
    // Clean potentially malformed JSON (remove markdown blocks if present)
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error: any) {
    console.error("Original Gemini Error Details:", {
      message: error?.message,
      status: error?.status,
      stack: error?.stack,
      model: "gemini-1.5-flash"
    });
    throw error;
  }
}

export const RECEIPT_PROMPT = `Você é um scanner de cupons fiscais brasileiros.
Analise a imagem e extraia:
- store_name (nome da loja/mercado)
- date (ISO string YYYY-MM-DD ou null)
- items: array de { name: '...', quantity: '...', price: '...', category: '...' }
- total: o valor total gasto

Categorias sugeridas: Frutas, Verduras, Carnes, Laticínios, Padaria, Bebidas, Limpeza, Higiene, Grãos, Temperos, Outros.
Tente identificar itens duplicados entre várias fotos e remova-os.
Retorne APENAS um JSON válido.`;

export const PRODUCT_PROMPT = `Você é um assistente de compras. Analise a imagem e identifique o nome do produto e sua categoria (Frutas, Verduras, Carnes, Laticínios, Padaria, Bebidas, Limpeza, Higiene, Grãos, Temperos, Outros). Retorne apenas um JSON: { "product_name": "...", "category": "..." }`;
