// ==========================================================================
// PEDIDOS.JS - Módulo especializado para gestión de perfil y pedidos
// ==========================================================================

// Variable de pestaña activa en Mi Cuenta
    let currentAccountTab = 'personal';

    function switchAccountTab(tabKey) {
      currentAccountTab = tabKey;
      try {
        history.replaceState(null, '', 'cuenta.html?tab=' + tabKey);
      } catch (e) {}
      const tabPersonal = document.getElementById('account-tab-personal');
      const tabOrders = document.getElementById('account-tab-orders');
      const tabFavorites = document.getElementById('account-tab-favorites');
      const btnPersonal = document.getElementById('tab-btn-personal');
      const btnOrders = document.getElementById('tab-btn-orders');
      const btnFavorites = document.getElementById('tab-btn-favorites');

      if (!tabPersonal || !tabOrders || !tabFavorites || !btnPersonal || !btnOrders || !btnFavorites) return;

      const activeClass = "flex items-center justify-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm md:text-base cursor-pointer bg-brand-forest text-brand-sunflower border-2 border-brand-forest shadow-md w-full min-h-[52px] sm:min-h-[56px] text-center";
      const inactiveClass = "flex items-center justify-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm md:text-base cursor-pointer bg-[#FEFAE0] text-brand-forest border-2 border-brand-forest hover:bg-[#CCD5AE]/30 w-full min-h-[52px] sm:min-h-[56px] text-center";

      tabPersonal.classList.add('hidden');
      tabOrders.classList.add('hidden');
      tabFavorites.classList.add('hidden');

      btnPersonal.className = inactiveClass;
      btnOrders.className = inactiveClass;
      btnFavorites.className = inactiveClass;

      btnPersonal.setAttribute('aria-selected', tabKey === 'personal' ? 'true' : 'false');
      btnOrders.setAttribute('aria-selected', tabKey === 'orders' ? 'true' : 'false');
      btnFavorites.setAttribute('aria-selected', tabKey === 'favorites' ? 'true' : 'false');
      btnPersonal.tabIndex = tabKey === 'personal' ? 0 : -1;
      btnOrders.tabIndex = tabKey === 'orders' ? 0 : -1;
      btnFavorites.tabIndex = tabKey === 'favorites' ? 0 : -1;

      if (tabKey === 'personal') {
        tabPersonal.classList.remove('hidden');
        btnPersonal.className = activeClass;
      } else if (tabKey === 'orders') {
        tabOrders.classList.remove('hidden');
        btnOrders.className = activeClass;
      } else if (tabKey === 'favorites') {
        tabFavorites.classList.remove('hidden');
        btnFavorites.className = activeClass;
        updateFavoritesTabContent();
      }
      btnFavorites.replaceChildren(getHeartIconSVG(tabKey === 'favorites', 'w-5 h-5 flex-shrink-0'), cloneTemplate('favorites-tab-label-template'));
    }

    function getAllOrders() {
      return accountService.orders;
    }

    function saveAllOrders() {
      // El historial solo se obtiene de la base de datos.
      return getAllOrders();
    }

    const pendingOrderStatuses = new Set();

    async function changeOrderStatus(orderNumber, newStatus) {
      const order = getAllOrders().find(item => item.number === orderNumber);
      if (!order || pendingOrderStatuses.has(order.id) || order.status === newStatus) return;
      pendingOrderStatuses.add(order.id);
      try {
        const saved = await accountService.changeOrderStatus(order.id, newStatus);
        const index = getAllOrders().findIndex(item => item.id === saved.id);
        const latest = document.querySelector('[data-latest-order]');
        if (index === 0 && latest) updateOrderElements(latest, saved, 'latest');
        const history = document.querySelectorAll('[data-order-history] [data-order-card]')[index];
        if (history) updateOrderElements(history, saved, index);
        showToast('Estado del pedido actualizado: ' + newStatus, 'ph-check-circle');
        syncCurrentPage();
      } catch (error) {
        showToast(authErrorMessage(error), 'ph-warning');
      } finally {
        pendingOrderStatuses.delete(order.id);
      }
    }

    function toggleStatusDropdown(key, event) {
      if (event) event.stopPropagation();
      const menu = document.getElementById(`status-menu-${key}`);
      const btn = document.getElementById(`status-btn-${key}`);
      if (!menu) return;

      const isHidden = menu.classList.contains('hidden');

      // Cerrar otros menús abiertos
      document.querySelectorAll('[id^="status-menu-"]').forEach(m => m.classList.add('hidden'));
      document.querySelectorAll('[id^="status-btn-"]').forEach(b => {
        b.setAttribute('aria-expanded', 'false');
        const caret = b.querySelector('.ph-caret-down');
        if (caret) caret.classList.remove('rotate-180');
      });

      if (isHidden) {
        menu.classList.remove('hidden');
        if (btn) {
          btn.setAttribute('aria-expanded', 'true');
          btn.setAttribute('aria-controls', menu.id);
          menu.setAttribute('aria-labelledby', btn.id);
          const caret = btn.querySelector('.ph-caret-down');
          if (caret) caret.classList.add('rotate-180');
        }
        const options = [...menu.querySelectorAll('[role="option"]')];
        const selected = options.find(option => option.getAttribute('aria-selected') === 'true') || options[0];
        options.forEach(option => { option.tabIndex = option === selected ? 0 : -1; });
        selected?.focus();
      }
    }

    async function selectCustomOrderStatus(orderNumber, newStatus) {
      const triggerId = document.activeElement.closest('[role="listbox"]')?.getAttribute('aria-labelledby');
      document.querySelectorAll('[id^="status-menu-"]').forEach(m => m.classList.add('hidden'));
      document.querySelectorAll('[id^="status-btn-"]').forEach(button => {
        button.setAttribute('aria-expanded', 'false');
        button.querySelector('.ph-caret-down')?.classList.remove('rotate-180');
      });
      await changeOrderStatus(orderNumber, newStatus);
      if (triggerId) document.getElementById(triggerId)?.focus({ preventScroll: true });
    }

    function toggleOrderItemsView(containerId, buttonEl) {
      const container = document.getElementById(containerId);
      if (!container) return;
      const isHidden = container.classList.contains('hidden');

      if (isHidden) {
        container.classList.remove('hidden');
        if (buttonEl) {
          const caret = buttonEl.querySelector('.ph-caret-down');
          if (caret) caret.classList.add('rotate-180');
        }
      } else {
        container.classList.add('hidden');
        if (buttonEl) {
          const caret = buttonEl.querySelector('.ph-caret-down');
          if (caret) caret.classList.remove('rotate-180');
        }
      }
    }

    

export function updateOrderElements(fragment, order, index) {
  const values = {
    ...order,
    total: Number(order.total).toFixed(2),
    index,
    itemCount: (order.items || []).length,
    itemLabel: (order.items || []).length === 1 ? 'producto' : 'productos'
  };
  if (window.bindValues) window.bindValues(fragment, values);
  const latest = !!(fragment.matches?.('[data-latest-order]') || fragment.querySelector('[data-latest-order]'));
  const items = fragment.querySelector('[data-order-items]');
  if (items && window.cloneTemplate && window.itemValues) {
    items.replaceChildren(...(order.items || []).map(item => window.cloneTemplate(latest ? 'latest-order-item-template' : 'history-order-item-template', window.itemValues(item))));
  }
  fragment.querySelectorAll('[data-order-status]').forEach(option => {
    const selected = option.getAttribute('data-order-status') === order.status;
    option.setAttribute('aria-selected', String(selected));
    option.classList.toggle('text-brand-sunflower', selected);
    option.classList.toggle('bg-brand-forest/60', selected);
    option.classList.toggle('text-brand-cream', !selected);
    option.querySelector('i')?.remove();
    if (selected && window.cloneTemplate) {
      option.append(window.cloneTemplate('ui-icon-template', { icon: 'ph-check text-brand-sunflower text-xs flex-shrink-0' }));
    }
  });
  const level = { 'Recibido': 1, 'En Tienda': 2, 'Listo para Retiro': 3, 'Entregado': 4 }[order.status] || 3;
  fragment.querySelectorAll('[data-order-level]').forEach(node => {
    const reached = Number(node.getAttribute('data-order-level')) <= level;
    node.classList.toggle('opacity-100', reached);
    node.classList.toggle('opacity-40', !reached);
    const title = node.firstElementChild;
    if (title) {
      title.classList.toggle('text-brand-sunflower', reached);
      title.classList.toggle('text-brand-cream/60', !reached);
      const icon = title.querySelector('i');
      if (icon) {
        icon.classList.toggle('ph-check-circle', reached);
        icon.classList.toggle('ph-circle-dashed', !reached);
        icon.classList.toggle('text-brand-sunflower', reached);
      }
    }
    if (node.getAttribute('data-order-level') === '4' && node.lastElementChild) {
      node.lastElementChild.textContent = reached ? 'Entregado en mostrador.' : 'Firma y recepción conforme.';
    }
  });
  return fragment;
}

export function updateAccountDetailsUI() {
  const panel = document.getElementById('account-tab-personal');
  if (!panel) return;
  const user = window.getCurrentUser?.() || {};
  if (window.bindValues) {
    window.bindValues(panel, {
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      idNumber: user.idNumber || '',
      docType: user.docType || 'Cédula'
    });
  }
  const fields = { 'acc-name': 'name', 'acc-username': 'username', 'acc-email': 'email', 'acc-phone': 'phone', 'acc-doc-type': 'docType', 'acc-id': 'idNumber' };
  Object.entries(fields).forEach(([id, key]) => {
    const input = document.getElementById(id);
    if (input) input.value = user[key] || (key === 'docType' ? 'Cédula' : '');
  });
  document.getElementById('acc-doc-type')?.dispatchEvent(new Event('change'));
  const history = document.querySelector('[data-order-history]');
  const latest = document.querySelector('[data-latest-order]');
  const orders = getAllOrders();
  if (history && window.cloneTemplate) {
    history.replaceChildren(...orders.map((order, index) => updateOrderElements(window.cloneTemplate('history-order-template'), order, index)));
  }
  if (latest && window.cloneTemplate) {
    if (orders.length) latest.replaceWith(updateOrderElements(window.cloneTemplate('latest-order-template'), orders[0], 'latest'));
    else latest.hidden = true;
  }
  if (window.updateFavoritesTabContent) window.updateFavoritesTabContent();
}

export function initializeAccountPage() {
  if (!document.getElementById('account-tab-personal')) return;
  if (!window.getCurrentUser?.()) {
    window.pendingCheckoutRedirect = window.getCurrentPageUrl?.();
    window.openAuthModal?.('login', 'Inicia sesión o regístrate para acceder a tu cuenta.');
  }
  updateAccountDetailsUI();
  const tab = new URLSearchParams(window.location.search).get('tab');
  switchAccountTab(['personal', 'orders', 'favorites'].includes(tab) ? tab : 'personal');
  if (new URLSearchParams(window.location.search).get('cambio') === 'clave' || window.location.hash.includes('type=recovery')) {
    setTimeout(() => {
      const newPassInput = document.getElementById('acc-new-password');
      if (newPassInput) {
        newPassInput.focus();
        newPassInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.showToast?.('Ingresa tu nueva contraseña y presiona Guardar Cambios.', 'ph-lock-key');
      }
    }, 300);
  }
}

// Exponer en window para compatibilidad
Object.assign(window, {
  switchAccountTab,
  getAllOrders,
  saveAllOrders,
  changeOrderStatus,
  toggleStatusDropdown,
  selectCustomOrderStatus,
  toggleOrderItemsView,
  updateOrderElements,
  updateAccountDetailsUI,
  initializeAccountPage
});

// Auto-inicializar si está en cuenta.html
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAccountPage, { once: true });
} else {
  initializeAccountPage();
}
