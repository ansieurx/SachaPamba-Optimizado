// ==========================================================================
// CHECKOUT.JS - Módulo especializado para el flujo de compras y pagos
// ==========================================================================

export function getMaxCheckoutStep() {
  const cart = window.cart || [];
  if (!cart || cart.length === 0) {
    sessionStorage.removeItem('sacha_max_checkout_step');
    return 1;
  }
  const val = parseInt(sessionStorage.getItem('sacha_max_checkout_step'), 10);
  return (!isNaN(val) && val >= 1) ? val : 1;
}

export function recordCheckoutStep(step) {
  const cart = window.cart || [];
  if (!cart || cart.length === 0) {
    sessionStorage.removeItem('sacha_max_checkout_step');
    return;
  }
  const current = getMaxCheckoutStep();
  if (step > current) {
    sessionStorage.setItem('sacha_max_checkout_step', String(step));
  }
}

export function resetCheckoutProgress() {
  sessionStorage.removeItem('sacha_max_checkout_step');
}

export function handleProceedToCheckout(e) {
  if (e) e.preventDefault();
  const user = window.getCurrentUser?.();
  if (!user) {
    window.pendingCheckoutRedirect = 'checkout-retiro.html';
    window.openAuthModal?.('register', 'Inicia sesión o regístrate para proceder con tu compra.');
    return;
  }
  window.navigateTo?.('checkout-retiro.html');
}

export function handleStepperNav(url) {
  if (url.startsWith('checkout') && !window.getCurrentUser?.()) {
    window.pendingCheckoutRedirect = url;
    window.openAuthModal?.('register', 'Inicia sesión o regístrate para proceder con tu compra.');
    return;
  }
  if (url.startsWith('checkout-pago') && document.getElementById('pickup-name')) {
    const name = document.getElementById('pickup-name');
    const id = document.getElementById('pickup-id');
    if (window.validateFields && !window.validateFields(['pickup-name', 'pickup-id'])) return;
    sessionStorage.setItem('sacha_web_pickup', JSON.stringify({
      name: name.value.trim(),
      idNumber: id.value.trim(),
      docType: window.checkoutDocumentType?.(id.value, window.getCurrentUser?.())
    }));
  }
  window.navigateTo?.(url);
}

export function getCheckoutPaymentAccessibilityText() {
  const selectedPaymentMethod = window.selectedPaymentMethod || sessionStorage.getItem('sacha_checkout_payment_method') || 'tarjeta';
  return selectedPaymentMethod === 'tarjeta'
    ? 'Opción seleccionada: Tarjeta de débito o crédito. Campos a completar para tarjeta: número de tarjeta, fecha de expiración y código CVV. Campos a completar para factura: razón social o nombre completo, cédula o RUC, y correo electrónico.'
    : 'Opción seleccionada: Pagar al retirar en tienda física. Campos a completar para factura: razón social o nombre completo, cédula o RUC, y correo electrónico.';
}

export function selectPaymentOption(option) {
  window.selectedPaymentMethod = option;
  sessionStorage.setItem('sacha_checkout_payment_method', option);
  const subtotal = Number(window.cartValues?.()?.total || 0);
  const cardContainer = document.getElementById('card-fields-container');
  const tiendaContainer = document.getElementById('tienda-info-container');
  const btnText = document.getElementById('btn-confirm-checkout-text');
  const btnTarjeta = document.getElementById('pay-opt-tarjeta');
  const btnTienda = document.getElementById('pay-opt-tienda');
  if (btnTarjeta) btnTarjeta.tabIndex = option === 'tarjeta' ? 0 : -1;
  if (btnTienda) btnTienda.tabIndex = option === 'tienda' ? 0 : -1;

  if (option === 'tarjeta') {
    if (cardContainer) cardContainer.classList.remove('hidden');
    if (tiendaContainer) tiendaContainer.classList.add('hidden');
    if (btnTarjeta) {
      btnTarjeta.className = 'border-2 border-brand-forest bg-[#CCD5AE] rounded-2xl p-4 flex flex-col gap-1.5 text-left transition-all shadow-xs cursor-pointer box-border';
      btnTarjeta.setAttribute('aria-checked', 'true');
    }
    if (btnTienda) {
      btnTienda.className = 'border-2 border-brand-forest/20 bg-brand-cream opacity-80 hover:opacity-100 rounded-2xl p-4 flex flex-col gap-1.5 text-left transition-all shadow-xs cursor-pointer box-border';
      btnTienda.setAttribute('aria-checked', 'false');
    }
    if (btnText) btnText.textContent = `Pagar $${subtotal.toFixed(2)} y Confirmar Pedido`;
  } else {
    if (cardContainer) cardContainer.classList.add('hidden');
    if (tiendaContainer) tiendaContainer.classList.remove('hidden');
    if (btnTarjeta) {
      btnTarjeta.className = 'border-2 border-brand-forest/20 bg-brand-cream opacity-80 hover:opacity-100 rounded-2xl p-4 flex flex-col gap-1.5 text-left transition-all shadow-xs cursor-pointer box-border';
      btnTarjeta.setAttribute('aria-checked', 'false');
    }
    if (btnTienda) {
      btnTienda.className = 'border-2 border-brand-forest bg-[#CCD5AE] rounded-2xl p-4 flex flex-col gap-1.5 text-left transition-all shadow-xs cursor-pointer box-border';
      btnTienda.setAttribute('aria-checked', 'true');
    }
    if (btnText) btnText.textContent = `Confirmar Pedido y Pagar al Retirar ($${subtotal.toFixed(2)})`;
  }
  const paymentAccessibilityText = document.getElementById('checkout-pago-a11y-texto');
  if (paymentAccessibilityText) paymentAccessibilityText.textContent = getCheckoutPaymentAccessibilityText();
}

export async function processPayment() {
  if (!window.getCurrentUser?.()) {
    window.pendingCheckoutRedirect = 'checkout-pago.html';
    window.openAuthModal?.('login');
    return;
  }
  const fields = ['checkout-inv-name', 'checkout-inv-id', 'checkout-inv-email'];
  const selectedPaymentMethod = window.selectedPaymentMethod || sessionStorage.getItem('sacha_checkout_payment_method') || 'tarjeta';
  if (selectedPaymentMethod === 'tarjeta') fields.unshift('checkout-card-num', 'checkout-card-exp', 'checkout-card-cvv');
  if (window.validateFields && !window.validateFields(fields)) return;

  await window.submitAccountRequest?.(document.getElementById('btn-confirm-checkout')?.closest('form'), async () => {
    const user = window.getCurrentUser();
    const pickup = JSON.parse(sessionStorage.getItem('sacha_web_pickup') || 'null') || {
      name: user.name, idNumber: user.idNumber
    };
    const pickupError = window.nameError?.(pickup.name) || window.documentError?.(pickup.docType || window.checkoutDocumentType?.(pickup.idNumber, user), pickup.idNumber);
    if (pickupError) throw new Error(pickupError);
    pickup.docType = pickup.docType || window.checkoutDocumentType?.(pickup.idNumber, user);
    pickup.billing = {
      name: document.getElementById('checkout-inv-name').value.trim(),
      idNumber: document.getElementById('checkout-inv-id').value.trim(),
      email: document.getElementById('checkout-inv-email').value.trim()
    };
    const signature = JSON.stringify([user.id, (window.cart || []).map(item => [item.id, item.quantity]), selectedPaymentMethod, pickup]);
    let saved = JSON.parse(sessionStorage.getItem('sacha_web_checkout_request') || 'null');
    if (!saved || saved.signature !== signature) {
      saved = { signature, id: crypto.randomUUID() };
      sessionStorage.setItem('sacha_web_checkout_request', JSON.stringify(saved));
    }
    const order = await window.accountService.createOrder(window.cart, selectedPaymentMethod, saved.id, pickup);
    window.cart = [];
    window.saveCart?.();
    resetCheckoutProgress();
    sessionStorage.removeItem('sacha_web_checkout_request');
    sessionStorage.removeItem('sacha_web_pickup');
    sessionStorage.removeItem('sacha_checkout_payment_method');
    window.showToast?.('Pedido ' + order.number + (selectedPaymentMethod === 'tarjeta'
      ? ' registrado. Pago pendiente.' : ' registrado para pagar al retirar.'), 'ph-check-circle');
    window.navigateTo?.('checkout-confirmacion.html');
  });
}

export function updateCheckoutSteps(step) {
  recordCheckoutStep(step);
  const maxStep = getMaxCheckoutStep();
  const stepLinks = [
    { num: 1, id: 'step-link-cart', url: 'carrito.html', label: 'Paso 1: Carrito de compras' },
    { num: 2, id: 'step-link-pickup', url: 'checkout-retiro.html', label: 'Paso 2: Datos de retiro' },
    { num: 3, id: 'step-link-payment', url: 'checkout-pago.html', label: 'Paso 3: Método de pago' }
  ];
  stepLinks.forEach(item => {
    const link = document.getElementById(item.id);
    if (!link) return;
    const isCompleted = item.num < step;
    const isCurrent = item.num === step;
    const isAccessible = item.num <= maxStep;

    link.setAttribute('aria-current', isCurrent ? 'step' : 'false');
    link.classList.toggle('opacity-50', !isAccessible && !isCurrent);
    link.classList.toggle('cursor-not-allowed', !isAccessible);
    link.classList.toggle('cursor-pointer', isAccessible);
  });
}

export function updateCheckoutTotals() {
  const totals = window.cartValues?.();
  if (!totals) return;
  const subtotalEl = document.getElementById('checkout-summary-subtotal');
  const discountEl = document.getElementById('checkout-summary-discount');
  const totalEl = document.getElementById('checkout-summary-total');
  if (subtotalEl) subtotalEl.textContent = `$${totals.subtotal}`;
  if (discountEl) discountEl.textContent = `-$${totals.discount}`;
  if (totalEl) totalEl.textContent = `$${totals.total}`;
}

export function initializePurchasePage() {
  const pickup = document.getElementById('pickup-name');
  const payment = document.getElementById('btn-confirm-checkout');
  const confirmation = document.querySelector('[aria-label="Resumen del pedido confirmado"]');
  const isCart = !!document.querySelector('[data-cart-items]');
  if (!pickup && !payment && !confirmation && !isCart) return;
  const user = window.getCurrentUser?.();
  if (pickup || payment) {
    if (!user) {
      window.pendingCheckoutRedirect = window.getCurrentPageUrl?.();
      window.openAuthModal?.('register', 'Inicia sesión o regístrate para proceder con tu compra.');
    } else if (!window.cart?.length) {
      window.location.replace('carrito.html');
      return;
    }
    const fields = { 'pickup-name': 'name', 'pickup-id': 'idNumber', 'checkout-inv-name': 'name', 'checkout-inv-id': 'idNumber', 'checkout-inv-email': 'email' };
    Object.entries(fields).forEach(([id, key]) => { const input = document.getElementById(id); if (input) input.value = user?.[key] || ''; });
    if (user?.docType === 'Pasaporte') {
      ['pickup-id', 'checkout-inv-id'].forEach(id => { const input = document.getElementById(id); if (input) input.inputMode = 'text'; });
    }
    const userLabel = document.querySelector('.tarjeta_usuario_retiro [title]');
    if (userLabel) { userLabel.textContent = user?.name || user?.email || 'Cliente'; userLabel.title = userLabel.textContent; }
    updateCheckoutSteps(pickup ? 2 : 3);
    updateCheckoutTotals();
  }
  if (confirmation) {
    updateCheckoutTotals();
    resetCheckoutProgress();
  }
}

// Exponer en window para compatibilidad con atributos HTML onclick
Object.assign(window, {
  getMaxCheckoutStep,
  recordCheckoutStep,
  resetCheckoutProgress,
  handleProceedToCheckout,
  handleStepperNav,
  getCheckoutPaymentAccessibilityText,
  selectPaymentOption,
  processPayment,
  updateCheckoutSteps,
  updateCheckoutTotals,
  initializePurchasePage
});

// Auto-inicializar si la página actual es de checkout
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePurchasePage, { once: true });
} else {
  initializePurchasePage();
}
