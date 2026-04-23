import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Lang = 'pt' | 'en' | 'es';

const currencyByLang: Record<Lang, string> = {
  pt: 'R$',
  en: 'US$',
  es: '$',
};

const translations: Record<string, Record<Lang, string>> = {
  hello: { pt: 'Olá', en: 'Hello', es: 'Hola' },
  user: { pt: 'Usuário', en: 'User', es: 'Usuario' },
  home: { pt: 'Início', en: 'Home', es: 'Inicio' },
  lists: { pt: 'Listas', en: 'Lists', es: 'Listas' },
  stock: { pt: 'Estoque', en: 'Stock', es: 'Stock' },
  savings: { pt: 'Economizar', en: 'Savings', es: 'Ahorros' },
  history: { pt: 'Histórico', en: 'History', es: 'Historial' },
  reports: { pt: 'Relatórios', en: 'Reports', es: 'Informes' },
  scanner: { pt: 'Scanner', en: 'Scanner', es: 'Escáner' },
  themes: { pt: 'Temas', en: 'Themes', es: 'Temas' },
  languages: { pt: 'Idiomas', en: 'Languages', es: 'Idiomas' },
  preferences: { pt: 'Preferências', en: 'Preferences', es: 'Preferencias' },
  about: { pt: 'Sobre', en: 'About', es: 'Acerca de' },
  logout: { pt: 'Sair', en: 'Logout', es: 'Salir' },
  resetAll: { pt: 'Reset Geral', en: 'Reset All', es: 'Restablecer Todo' },
  deleteAccount: { pt: 'Excluir Conta', en: 'Delete Account', es: 'Eliminar Cuenta' },
  light: { pt: 'Claro', en: 'Light', es: 'Claro' },
  dark: { pt: 'Escuro', en: 'Dark', es: 'Oscuro' },
  largeText: { pt: 'Letras Grandes', en: 'Large Text', es: 'Texto Grande' },
  themeDesc: { pt: 'Aparência do aplicativo', en: 'App appearance', es: 'Apariencia de la app' },
  langDesc: { pt: 'Escolher idioma do app', en: 'Choose app language', es: 'Elegir idioma' },
  prefDesc: { pt: 'Ajustes gerais', en: 'General settings', es: 'Ajustes generales' },
  aboutDesc: { pt: 'Informações do aplicativo', en: 'App information', es: 'Información de la app' },
  logoutDesc: { pt: 'Fazer logout da conta', en: 'Log out of account', es: 'Cerrar sesión' },
  resetDesc: { pt: 'Apagar todos as listas, histórico e estoques', en: 'Delete all lists, history and stock', es: 'Borrar listas, historial y stock' },
  deleteDesc: { pt: 'Apaga permanentemente a conta', en: 'Permanently delete account', es: 'Eliminar cuenta permanentemente' },
  stockExpiry: { pt: 'Dias para excluir item do estoque', en: 'Days to delete stock item', es: 'Días para eliminar del stock' },
  days: { pt: 'dias', en: 'days', es: 'días' },
  developedBy: { pt: 'Desenvolvido por ID Apps 2026', en: 'Developed by ID Apps 2026', es: 'Desarrollado por ID Apps 2026' },
  termsText: { pt: 'Ao usar este app você aceita os termos de uso e privacidade em:', en: 'By using this app you accept the terms of use and privacy at:', es: 'Al usar esta app aceptas los términos de uso y privacidad en:' },
  login: { pt: 'Entrar', en: 'Sign In', es: 'Iniciar Sesión' },
  loginWithGoogle: { pt: 'Entrar com Google', en: 'Sign in with Google', es: 'Iniciar con Google' },
  loginWithEmail: { pt: 'Entrar com E-mail', en: 'Sign in with Email', es: 'Iniciar con E-mail' },
  email: { pt: 'E-mail', en: 'Email', es: 'Correo' },
  password: { pt: 'Senha', en: 'Password', es: 'Contraseña' },
  signUp: { pt: 'Criar conta', en: 'Sign Up', es: 'Crear cuenta' },
  noAccount: { pt: 'Não tem conta?', en: "Don't have an account?", es: '¿No tienes cuenta?' },
  hasAccount: { pt: 'Já tem conta?', en: 'Already have an account?', es: '¿Ya tienes cuenta?' },
  confirmReset: { pt: 'Tem certeza? Isso apagará todas as listas, histórico e estoque.', en: 'Are you sure? This will delete all lists, history and stock.', es: '¿Estás seguro? Esto eliminará listas, historial y stock.' },
  confirmDelete: { pt: 'Tem certeza? Sua conta será apagada permanentemente.', en: 'Are you sure? Your account will be permanently deleted.', es: '¿Estás seguro? Tu cuenta será eliminada permanentemente.' },
  confirm: { pt: 'Confirmar', en: 'Confirm', es: 'Confirmar' },
  cancel: { pt: 'Cancelar', en: 'Cancel', es: 'Cancelar' },
  newList: { pt: 'Nova Lista', en: 'New List', es: 'Nueva Lista' },
  createList: { pt: 'Criar lista de compras', en: 'Create shopping list', es: 'Crear lista de compras' },
  goShopping: { pt: 'Fazer Mercado', en: 'Go Shopping', es: 'Ir al Mercado' },
  addProducts: { pt: 'Adicionar produtos na cesta', en: 'Add products to basket', es: 'Agregar productos' },
  scan: { pt: 'Escanear', en: 'Scan', es: 'Escanear' },
  receipt: { pt: 'Nota fiscal', en: 'Receipt', es: 'Recibo' },
  share: { pt: 'Compartilhar', en: 'Share', es: 'Compartir' },
  activeLists: { pt: 'Listas ativas', en: 'Active lists', es: 'Listas activas' },
  activeListsTitle: { pt: 'Listas Ativas', en: 'Active Lists', es: 'Listas Activas' },
  cheapDays: { pt: 'Dias de compras mais baratos', en: 'Cheapest shopping days', es: 'Días de compras más baratos' },
  alerts: { pt: 'Alertas', en: 'Alerts', es: 'Alertas' },
  items: { pt: 'Itens', en: 'Items', es: 'Ítems' },
  active: { pt: 'Ativas', en: 'Active', es: 'Activas' },
  currentMonth: { pt: 'Mês Atual', en: 'Current Month', es: 'Mes Actual' },
  daysLeft: { pt: 'dias restantes', en: 'days left', es: 'días restantes' },
  noActiveLists: { pt: 'Nenhuma lista ativa', en: 'No active lists', es: 'Sin listas activas' },
  stockUpToDate: { pt: 'Estoque em dia ✅', en: 'Stock up to date ✅', es: 'Stock al día ✅' },
  clear: { pt: 'Limpar', en: 'Clear', es: 'Limpiar' },
  seeAll: { pt: 'Ver todas', en: 'See all', es: 'Ver todas' },
  menu: { pt: 'Menu', en: 'Menu', es: 'Menú' },
  geminiApiKey: { pt: 'Chave API Gemini', en: 'Gemini API Key', es: 'Clave API Gemini' },
  geminiApiKeyDesc: { pt: 'Chave pessoal para funções de IA', en: 'Personal key for AI features', es: 'Clave personal para funciones de IA' },
  geminiApiKeySaved: { pt: 'Chave salva com sucesso!', en: 'Key saved successfully!', es: '¡Clave guardada!' },
  geminiApiKeyDeleted: { pt: 'Chave removida.', en: 'Key removed.', es: 'Clave eliminada.' },
  geminiPaste: { pt: 'Colar', en: 'Paste', es: 'Pegar' },
  geminiDelete: { pt: 'Apagar', en: 'Delete', es: 'Borrar' },
  geminiSave: { pt: 'Salvar', en: 'Save', es: 'Guardar' },
  geminiPlaceholder: { pt: 'Cole sua chave API aqui', en: 'Paste your API key here', es: 'Pegue su clave API aquí' },
  geminiConfigured: { pt: 'Configurada', en: 'Configured', es: 'Configurada' },
  geminiNotConfigured: { pt: 'Não configurada', en: 'Not configured', es: 'No configurada' },
  geminiHelpTitle: { pt: 'Como obter sua chave API Gemini', en: 'How to get your Gemini API Key', es: 'Cómo obtener tu clave API Gemini' },
  geminiHelpSteps: {
    pt: '1. Acesse https://aistudio.google.com/apikey\n2. Faça login com sua conta Google\n3. Clique em "Create API Key"\n4. Copie a chave gerada\n5. Cole aqui no app e salve',
    en: '1. Go to https://aistudio.google.com/apikey\n2. Sign in with your Google account\n3. Click "Create API Key"\n4. Copy the generated key\n5. Paste it here in the app and save',
    es: '1. Accede a aistudio.google.com\n2. Inicia sesión con tu cuenta Google\n3. Haz clic en "Get API Key" en el menú\n4. Haz clic en "Create API Key"\n5. Copia la clave generada\n6. Pégala aquí en la app y guarda',
  },
  scannerApiKeyInfo: {
    pt: 'Para escanear cupons, configure sua chave API Gemini no menu de configurações.',
    en: 'To scan receipts, set up your Gemini API key in the settings menu.',
    es: 'Para escanear recibos, configura tu clave API Gemini en el menú de ajustes.',
  },
  scannerApiKeyConfigured: {
    pt: 'Chave API Gemini configurada. Para trocar a chave, acesse o menu de configurações.',
    en: 'Gemini API key configured. To change it, go to the settings menu.',
    es: 'Clave API Gemini configurada. Para cambiarla, accede al menú de ajustes.',
  },
  scannerGoToSettings: {
    pt: 'Abrir Configurações',
    en: 'Open Settings',
    es: 'Abrir Ajustes',
  },
  addStockItem: { pt: 'Adicionar Produto', en: 'Add Product', es: 'Agregar Producto' },
  scanReceiptBtn: { pt: 'Scanner Cupom', en: 'Receipt Scanner', es: 'Escáner de Recibo' },
  anytime: { pt: 'Qualquer data', en: 'Any date', es: 'Cualquer fecha' },
  allStores: { pt: 'Todas as lojas', en: 'All stores', es: 'Todas las tiendas' },
  back: { pt: 'Voltar', en: 'Back', es: 'Volver' },
  save: { pt: 'Salvar', en: 'Save', es: 'Guardar' },
  cancelBtn: { pt: 'Cancelar', en: 'Cancel', es: 'Cancelar' },
  analyzingWithAI: { pt: 'Analisando com IA...', en: 'Analyzing with AI...', es: 'Analizando con IA...' },
  completedPercent: { pt: 'concluído', en: 'completed', es: 'completado' },
  optimizeImages: { pt: 'Otimizando imagens...', en: 'Optimizing images...', es: 'Optimizando imágenes...' },
  sendingImages: { pt: 'Enviando imagens para análise...', en: 'Sending images for analysis...', es: 'Enviando imágenes para análisis...' },
  processingResponse: { pt: 'Resposta recebida. Processando itens...', en: 'Response received. Processing items...', es: 'Respuesta recibida. Procesando ítems...' },
  completingAnalysis: { pt: 'Concluído!', en: 'Done!', es: '¡Completado!' },
  missingApiKeyError: { pt: 'Chave API não encontrada. Por favor, configure-a no Menu > Configurações.', en: 'API Key not found. Please configure it in Menu > Settings.', es: 'Clave API no encontrada. Por favor, configúrala en el Menú > Ajustes.' },
  singlePhoto: { pt: 'Foto Única', en: 'Single Photo', es: 'Foto Única' },
  singlePhotoDesc: { pt: 'Para cupons pequenos que cabem em uma única foto', en: 'For small receipts that fit in a single photo', es: 'Para cupones pequeños que caben en una sola foto' },
  multiPhoto: { pt: 'Múltiplas Fotos', en: 'Multiple Photos', es: 'Múltiples Fotos' },
  multiPhotoDesc: { pt: 'Para cupons longos — tire várias fotos e a IA consolida tudo', en: 'For long receipts — take several photos and AI consolidates it all', es: 'Para cupones largos: toma varias fotos y la IA consolida todo' },
  scannerHistory: { pt: 'Histórico de Cupons', en: 'Receipt History', es: 'Historial de Cupones' },
  scannerHistoryDesc: { pt: 'Veja todos os cupons escaneados e gerencie seus registros', en: 'See all scanned receipts and manage your records', es: 'Ver todos los cupones escaneados' },
  aiScannerTitle: { pt: 'Scanner com Inteligência Artificial', en: 'AI-Powered Scanner', es: 'Escáner con Inteligencia Artificial' },
  aiScannerDesc: { pt: 'O escâner utiliza IA para detectar e extrair texto dos cupons fiscais automaticamente. Para funcionar, é necessária uma chave API do Gemini, que pode ser obtida gratuitamente.', en: 'The scanner uses AI to detect and extract text from receipts automatically. To work, a Gemini API key is required, which can be obtained for free.', es: 'El escáner utiliza IA para detectar y extraer texto automáticamente. Se requiere una clave API de Gemini.' },
  getApiKeyHowTo: { pt: 'Como obter sua chave API gratuita:', en: 'How to get your free API key:', es: 'Cómo obtener tu clave API gratuita:' },
  loginToGoogle: { pt: 'Faça login com sua conta Google', en: 'Log in with your Google account', es: 'Inicia sesión con tu cuenta de Google' },
  clickCreateKey: { pt: 'Clique em "Create API Key"', en: 'Click "Create API Key"', es: 'Haz clic en "Create API Key"' },
  copyKey: { pt: 'Copie a chave gerada', en: 'Copy the generated key', es: 'Copia la clave generada' },
  pasteInSettings: { pt: 'Cole a chave em:', en: 'Paste the key in:', es: 'Pegue la clave en:' },
  sumOriginal: { pt: 'Soma dos itens (original)', en: 'Sum of items (original)', es: 'Suma de ítems (original)' },
  discountApplied: { pt: 'Desconto aplicado', en: 'Discount applied', es: 'Descuento aplicado' },
  sumWithDiscount: { pt: 'Soma com desconto', en: 'Sum with discount', es: 'Suma con descuento' },
  receiptTotalKey: { pt: 'Total do cupom', en: 'Receipt total', es: 'Total del cupón' },
  saveToStock: { pt: 'Salvar no Estoque e Histórico', en: 'Save to Stock and History', es: 'Guardar en Stock e Historial' },
  applyDiscounts: { pt: 'Aplicar descontos', en: 'Apply discounts', es: 'Aplicar descuentos' },
  withoutDiscounts: { pt: 'Sem descontos', en: 'Without discounts', es: 'Sin descuentos' },
  deleteReceiptConfirm: { pt: 'Excluir cupom?', en: 'Delete receipt?', es: '¿Eliminar cupón?' },
  deleteReceiptDesc: { pt: 'Todos os itens deste cupom serão removidos do histórico e do estoque. Esta ação não pode ser desfeita.', en: 'All items from this receipt will be removed from history and stock. This cannot be undone.', es: 'Todos los ítems se eliminarán del historial y stock. No se puede deshacer.' },
  yesDelete: { pt: 'Sim, excluir', en: 'Yes, delete', es: 'Sí, eliminar' },
  no: { pt: 'Não', en: 'No', es: 'No' },
  scannedReceiptsLabel: { pt: 'cupons escaneados', en: 'scanned receipts', es: 'cupones escaneados' },
  noReceiptsScanned: { pt: 'Nenhum cupom escaneado ainda.', en: 'No receipts scanned yet.', es: 'Ningún cupón escaneado aún.' },
  seeItems: { pt: 'Ver itens', en: 'See items', es: 'Ver ítems' },
  delete: { pt: 'Excluir', en: 'Delete', es: 'Eliminar' },
  results: { pt: 'Resultado', en: 'Result', es: 'Resultado' },
  dateNotFound: { pt: 'Data não encontrada', en: 'Date not found', es: 'Fecha no encontrada' },
  extractedFromReceipt: { pt: 'Extraída do cupom', en: 'Extracted from receipt', es: 'Extraída del cupón' },
  fillDateWarning: { pt: 'Preencha a data da compra antes de salvar.', en: 'Fill in the purchase date before saving.', es: 'Completa la fecha de compra antes de guardar.' },
  differenceWarningPrefix: { pt: 'Diferença de', en: 'Difference of', es: 'Diferencia de' },
  differenceWarningSuffix: { pt: 'entre o total do cupom e a soma dos itens. Algum item pode não ter sido identificado corretamente. Ajuste preços, quantidades, ou adicione/remova itens abaixo.', en: 'between the receipt total and the sum of items. Some items may not have been identified correctly. Adjust prices, quantities, or add/remove items below.', es: 'entre el total del cupón y la suma de ítems. Revisa los precios y cantidades.' },
  foundItemsSubtitle: { pt: 'itens encontrados', en: 'items found', es: 'ítems encontrados' },
  addItemBtn: { pt: 'Adicionar Item', en: 'Add Item', es: 'Añadir Ítem' },
  noneFoundMsg: { pt: 'Nenhum item encontrado no cupom.', en: 'No items found on the receipt.', es: 'No se encontraron ítems en el cupón.' },
  lightingTip: { pt: 'Tente fotografar com melhor iluminação.', en: 'Try taking the photo with better lighting.', es: 'Prueba con mejor iluminación.' },
  saveSuccessful: { pt: 'Salvo com sucesso!', en: 'Saved successfully!', es: '¡Guardado con éxito!' },
  itemsAddedMsg: { pt: 'itens adicionados ao estoque e histórico', en: 'items added to stock and history', es: 'ítems añadidos al stock e historial' },
  scanAnotherBtn: { pt: 'Escanear outro cupom', en: 'Scan another receipt', es: 'Escanear otro cupón' },
  takeReceiptPhoto: { pt: 'Fotografar Cupom', en: 'Take Receipt Photo', es: 'Tomar Foto del Cupón' },
  addMorePhotos: { pt: 'Adicionar Mais Fotos', en: 'Add More Photos', es: 'Añadir Más Fotos' },
  tapToTakeOrGallery: { pt: 'Toque para tirar foto ou selecionar da galeria', en: 'Tap to take photo or select from gallery', es: 'Toca para tomar foto o seleccionar de la galería' },
  multiPhotoTipTitle: { pt: '📸 Dica para cupons longos:', en: '📸 Tip for long receipts:', es: '📸 Tip para cupones largos:' },
  multiPhotoTipDesc: { pt: 'Ao fotografar, garanta que o último item visível de uma foto apareça também no início da próxima foto. Essa sobreposição permite que a IA identifique a junção e evite duplicar itens.', en: 'When photographing, ensure the last visible item of a photo also appears at the beginning of the next photo. This overlap allows AI to identify the junction and avoid duplicating items.', es: 'Al fotografiar, asegúrate de que el último ítem visible aparezca al inicio de la siguiente foto.' },
  imagesAddedMsg: { pt: 'fotos adicionadas — a IA vai identificar as sobreposições automaticamente.', en: 'photos added — AI will identify overlaps automatically.', es: 'fotos añadidas — la IA identificará las superposiciones automáticamente.' },
  processMultiWithAI: { pt: 'Processar fotos com IA', en: 'Process photos with AI', es: 'Procesar fotos con IA' },
  analysisError: { pt: 'Erro na análise', en: 'Analysis error', es: 'Error en el análisis' },
  takePhotoSub: { pt: 'Tire uma foto do cupom', en: 'Take a photo of the receipt', es: 'Toma una foto del cupón' },
  photosAddedSub: { pt: 'foto(s) adicionada(s)', en: 'photo(s) added', es: 'foto(s) añadida(s)' },
  historyItemsCount: { pt: 'itens', en: 'items', es: 'ítems' },
  historyItemCount: { pt: 'item', en: 'item', es: 'ítem' },
  purchaseDateLabel: { pt: '📅 Data da compra:', en: '📅 Purchase date:', es: '📅 Fecha de compra:' },
  editItemBtn: { pt: 'OK', en: 'OK', es: 'OK' },
  productNamePlaceholder: { pt: 'Nome do produto', en: 'Product name', es: 'Nombre del producto' },
  qtyLabel: { pt: 'Qtd', en: 'Qty', es: 'Cant' },
  unitLabel: { pt: 'Un', en: 'Unit', es: 'Un' },
  unitPriceLabel: { pt: 'Preço un.', en: 'Unit price', es: 'Precio un.' },
  discountLabel: { pt: 'Desconto', en: 'Discount', es: 'Descuento' },
  originalLabel: { pt: 'Original', en: 'Original', es: 'Original' },
  withDiscountLabel: { pt: 'Com desconto', en: 'With discount', es: 'Con descuento' },
  historySubtitle: { pt: 'Suas compras anteriores', en: 'Your previous purchases', es: 'Tus compras anteriores' },
  monthTotal: { pt: 'Total do mês', en: 'Month total', es: 'Total del mes' },
  editAddressTitle: { pt: 'Editar Endereço', en: 'Edit Address', es: 'Editar Dirección' },
  locationLabel: { pt: 'Local', en: 'Location', es: 'Ubicación' },
  purchaseDateLabel: { pt: 'Data da compra', en: 'Purchase date', es: 'Fecha de compra' },
  scanReceiptMsg: { pt: 'Escaneie o cupom fiscal desta compra para completar informações faltantes', en: 'Scan the receipt for this purchase to complete missing info', es: 'Escanea el recibo de esta compra para completar información' },
  editBtn: { pt: 'Editar', en: 'Edit', es: 'Editar' },
  invalidDate: { pt: 'Data Inválida', en: 'Invalid Date', es: 'Fecha Inválida' },
  gettingLocation: { pt: 'Obtendo localização...', en: 'Getting location...', es: 'Obteniendo ubicación...' },
  reminderListName: { pt: 'Lembrete de Compras', en: 'Shopping Reminders', es: 'Recordatorios de Compra' },
  addedToReminders: { pt: 'adicionado à lista Lembrete de Compras', en: 'added to Shopping Reminders', es: 'agregado a Recordatorios de Compra' },
  stockText: { pt: 'Estoque', en: 'Stock', es: 'Stock' },
  productName: { pt: 'Nome do produto', en: 'Product name', es: 'Nombre del producto' },
  productNamePlaceholder: { pt: 'Ex: Arroz, Leite...', en: 'E.g. Rice, Milk...', es: 'Ej: Arroz, Leche...' },
  category: { pt: 'Categoria', en: 'Category', es: 'Categoría' },
  unit: { pt: 'Unidade', en: 'Unit', es: 'Unidad' },
  quantity: { pt: 'Quantidade', en: 'Quantity', es: 'Cantidad' },
  minQuantity: { pt: 'Qtd. mínima', en: 'Min. quantity', es: 'Cant. mínima' },
  addItem: { pt: 'Adicionar', en: 'Add', es: 'Agregar' },
  price: { pt: 'Valor', en: 'Price', es: 'Precio' },
  trialDaysLeft: { pt: 'restante do período de teste', en: 'left in trial period', es: 'restante del período de prueba' },
  trialDaysLeftPlural: { pt: 'restantes do período de teste', en: 'left in trial period', es: 'restantes del período de prueba' },
  premiumTitle: { pt: 'Premium', en: 'Premium', es: 'Premium' },
  premiumDesc: { pt: 'Acesso completo por', en: 'Full access for', es: 'Acceso completo por' },
  premiumPerYear: { pt: '/ano', en: '/year', es: '/año' },
  premiumSubscribe: { pt: 'Assinar', en: 'Subscribe', es: 'Suscribir' },
  day: { pt: 'dia', en: 'day', es: 'día' },
  dayPlural: { pt: 'dias', en: 'days', es: 'días' },
  subBannerTitle: { pt: 'Assine o Magicmart AI', en: 'Subscribe to Magicmart AI', es: 'Suscríbete a Magicmart AI' },
  subBannerCancel: { pt: '30 dias para cancelar', en: '30 days to cancel', es: '30 días para cancelar' },
  subExpiryWarning: { pt: 'para a assinatura expirar. Renove agora!', en: 'until subscription expires. Renew now!', es: 'para que expire la suscripción. ¡Renueva ahora!' },
  payment: { pt: 'Pagamento', en: 'Payment', es: 'Pago' },
  paymentDesc: { pt: 'Gerenciar assinatura', en: 'Manage subscription', es: 'Gestionar suscripción' },
  renew: { pt: 'Renovar', en: 'Renew', es: 'Renovar' },
  refund: { pt: 'Reembolso', en: 'Refund', es: 'Reembolso' },
  renewDesc: { pt: 'Renovar assinatura anual', en: 'Renew annual subscription', es: 'Renovar suscripción anual' },
  refundDesc: { pt: 'Solicitar reembolso (até 30 dias)', en: 'Request refund (up to 30 days)', es: 'Solicitar reembolso (hasta 30 días)' },
  appTagline: { pt: 'Sua despensa inteligente', en: 'Your smart pantry', es: 'Tu despensa inteligente' },
  pricingDesc: { pt: 'Gerencie compras, estoque e gastos com inteligência artificial.', en: 'Manage shopping, stock and expenses with artificial intelligence.', es: 'Gestiona compras, stock y gastos con inteligencia artificial.' },
  pricingFeature1: { pt: 'Scanner de cupons com IA', en: 'AI-powered receipt scanner', es: 'Escáner de recibos con IA' },
  pricingFeature2: { pt: 'Controle de estoque inteligente', en: 'Smart inventory control', es: 'Control de inventario inteligente' },
  pricingFeature3: { pt: 'Relatórios de economia', en: 'Savings reports', es: 'Informes de ahorro' },
  pricingFeature4: { pt: 'Listas de compras ilimitadas', en: 'Unlimited shopping lists', es: 'Listas de compras ilimitadas' },
  pricingFeature5: { pt: '30 dias para cancelar e reembolso', en: '30 days to cancel and refund', es: '30 días para cancelar y reembolso' },
  developerMode: { pt: 'Modo Desenvolvedor', en: 'Developer Mode', es: 'Modo Desarrollador' },
  developerModeDesc: { pt: 'Entrar direto no app para testes', en: 'Enter app directly for testing', es: 'Entrar directo para pruebas' },
  listDeleted: { pt: 'Lista excluída.', en: 'List deleted.', es: 'Lista eliminada.' },
  listArchived: { pt: 'Lista arquivada.', en: 'List archived.', es: 'Lista archivada.' },
  alertRemoved: { pt: 'Alerta removido.', en: 'Alert removed.', es: 'Alerta eliminado.' },
  addedToShoppingList: { pt: 'Adicionado à lista de compras.', en: 'Added to shopping list.', es: 'Agregado a la lista de compras.' },
};

function formatNumber(value: number, curr: string): string {
  if (curr === 'US$') {
    // American: dot decimal, comma thousands
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  // Brazilian/European: comma decimal, dot thousands
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  currency: string;
  formatCurrency: (value: number) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'pt',
  setLang: () => {},
  t: (k) => k,
  currency: 'R$',
  formatCurrency: (v) => `R$ ${v.toFixed(2)}`,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() =>
    (localStorage.getItem('app-lang') as Lang) || 'pt'
  );
  const [isEurope, setIsEurope] = useState<boolean>(() => {
    return localStorage.getItem('app-region') === 'europe';
  });

  // Detect if user is in Europe on mount
  useEffect(() => {
    const cached = localStorage.getItem('app-region');
    if (cached) return; // already detected

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=en`,
              { headers: { 'User-Agent': 'MagicmartAI/1.0' } }
            );
            const data = await res.json();
            const country = data?.address?.country_code?.toLowerCase() || '';
            const europeanCountries = [
              'at','be','bg','hr','cy','cz','dk','ee','fi','fr','de','gr','hu',
              'ie','it','lv','lt','lu','mt','nl','pl','pt','ro','sk','si','es',
              'se','gb','no','ch','is'
            ];
            const inEurope = europeanCountries.includes(country);
            localStorage.setItem('app-region', inEurope ? 'europe' : 'other');
            setIsEurope(inEurope);
          } catch {
            localStorage.setItem('app-region', 'other');
          }
        },
        () => {
          localStorage.setItem('app-region', 'other');
        },
        { timeout: 5000 }
      );
    }
  }, []);

  const setLang = (l: Lang) => {
    localStorage.setItem('app-lang', l);
    setLangState(l);
  };

  const t = (key: string) => translations[key]?.[lang] || key;

  // Currency: pt/es in Europe → €, otherwise default by lang
  const currency = (lang === 'pt' || lang === 'es') && isEurope ? '€' : currencyByLang[lang];

  const fc = (value: number) => `${currency} ${formatNumber(value, currency)}`;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, currency, formatCurrency: fc }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
