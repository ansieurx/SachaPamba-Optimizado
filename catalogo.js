// ==========================================================================
// CATALOGO.JS - Módulo especializado para categorías, filtros y cuadrícula
// ==========================================================================

export function getCatalogProducts(params) {
  const products = window.PRODUCTS || [];
  const cat = params.get('cat');
  const subcat = params.get('subcat');
  const special = params.get('special');
  const specialFilters = {
    destacados: product => product.isFeatured,
    'mas-vendidos': product => product.isBestSeller,
    nuevos: product => product.isNew
  };
  return products.filter(product => special
    ? (specialFilters[special] || (p => p.isFeatured || p.isBestSeller || p.isNew))(product)
    : (!cat || product.category === cat) && (!subcat || product.subcategory === subcat));
}

export function updateCatalogCounters() {
  const products = window.PRODUCTS || [];
  if (!products.length) return;
  const menus = '#nav-category-menu, aside[aria-label="Filtros del catálogo"]';
  document.querySelectorAll(menus).forEach(menu => {
    menu.querySelectorAll('a[href]').forEach(link => {
      const url = new URL(link.href, window.location.href);
      if (!url.pathname.endsWith('/categoria.html')) return;
      const badge = link.lastElementChild;
      if (badge?.matches('span.rounded-full')) {
        const count = getCatalogProducts(url.searchParams).length;
        if (badge.textContent !== String(count)) badge.textContent = count;
      }
    });

    menu.querySelectorAll('.nav-cat-header, .sidebar-cat-header').forEach(header => {
      const link = header.matches('.nav-cat-header')
        ? header.closest('.nav-cat-card')?.querySelector('a[href]')
        : null;
      const params = link
        ? new URL(link.href, window.location.href).searchParams
        : new URLSearchParams(header.dataset.cat === 'especiales'
          ? { special: 'all' }
          : { cat: header.dataset.cat });
      const badge = header.querySelector('span.rounded-full');
      if (badge) {
        const count = getCatalogProducts(params).length;
        if (badge.textContent !== String(count)) badge.textContent = count;
      }
    });
  });
}

export function formatCatalogTitle(title) {
  const clean = String(title ?? '').replace(/&amp;/g, '&');
  return clean.split('&').map(part => (window.escapeHtml ? window.escapeHtml(part.trim()) : part.trim())).join(' <span class="amp-normal">&amp;</span> ');
}

export function updateCatalogSelection() {
  const grid = document.querySelector('[data-catalog-grid]');
  if (!grid) return;
  const params = new URLSearchParams(window.location.search);
  const cat = params.get('cat'), subcat = params.get('subcat'), special = params.get('special');
  const products = getCatalogProducts(params);
  const categories = window.getCatalogCategoriesAndSubcategories ? window.getCatalogCategoriesAndSubcategories() : {};
  const categoryName = categories[cat]?.name || 'Todos los Productos';
  const title = special ? ({destacados:'Productos Destacados','mas-vendidos':'Los Más Vendidos',nuevos:'Productos Nuevos'}[special] || 'Toda la Selección Especial') : (categories[cat]?.subcategories[subcat] || categoryName);
  const titleEl = document.querySelector('[data-catalog-title]');
  if (titleEl && (titleEl.dataset.titleRaw !== title || titleEl.textContent.trim() !== title.trim())) {
    titleEl.dataset.titleRaw = title;
    titleEl.innerHTML = formatCatalogTitle(title);
  }
  const countEl = document.querySelector('[data-catalog-count]');
  if (countEl && countEl.textContent !== String(products.length)) countEl.textContent = products.length;
  document.querySelector('[data-catalog-results]')?.setAttribute('aria-label', `Listado de productos: ${title}`);
  const route = window.location.pathname + window.location.search;
  const hasPreparedView = grid.dataset.catalogSnapshot === route && grid.querySelectorAll('.product-card').length === products.length;
  if (!hasPreparedView) {
    const currentScrollY = window.scrollY || window.pageYOffset || 0;
    grid.replaceChildren(...(products.length ? products.map(p => window.cloneTemplate('product-card-template', window.productValues(p))) : [window.cloneTemplate('catalog-empty-template')]));
    const returningScroll = sessionStorage.getItem('sacha_catalog_scroll_pos');
    const prevRoute = sessionStorage.getItem('sacha_prev_route');
    const targetScroll = (returningScroll !== null && prevRoute === window.getCurrentPageUrl?.())
      ? Number(returningScroll)
      : currentScrollY;
    if (targetScroll > 0) {
      window.scrollTo({ top: targetScroll, left: 0, behavior: 'instant' });
    }
  }
  grid.querySelectorAll('img').forEach((image, index) => {
    image.loading = index < 4 ? 'eager' : 'lazy';
    image.fetchPriority = index < 4 ? 'high' : 'auto';
  });
  document.querySelectorAll('[data-filter-idle-class]').forEach(node => {
    const link = node.closest('a[href]');
    let active;
    if (link) {
      const query = new URL(link.href, window.location.href).searchParams;
      active = query.has('special') ? query.get('special') === special : query.has('cat') ? query.get('cat') === cat && (query.get('subcat') || null) === subcat && !special : !cat && !special;
      const targetClass = node.getAttribute(active ? 'data-filter-active-class' : 'data-filter-idle-class');
      if (targetClass && node.className !== targetClass) node.className = targetClass;
      return;
    } else {
      const header = node.closest('.sidebar-cat-header') || node.querySelector('.sidebar-cat-header') || node.parentElement?.querySelector('.sidebar-cat-header');
      active = header?.getAttribute('data-cat') === 'especiales' ? !!special : !!cat && header?.getAttribute('data-cat') === cat && !special;
      if (node.matches('.sidebar-cat-header')) {
        node.setAttribute('aria-expanded', String(active));
        const targetClass = node.getAttribute('data-filter-idle-class');
        if (targetClass && node.className !== targetClass) node.className = targetClass;
        return;
      }
    }
    const targetClass = node.getAttribute(active ? 'data-filter-active-class' : 'data-filter-idle-class');
    if (targetClass && node.className !== targetClass) node.className = targetClass;
  });
  const crumbs = document.querySelector('[data-catalog-breadcrumbs]');
  if (crumbs) {
    const segments = [{label:'Inicio',href:'index.html'}, {label:'Productos',href:cat||special?'categoria.html':null}];
    if (cat || special) segments.push({label:special?'Selección Especial':categoryName,href:subcat||special?(special?'categoria.html?special=all':`categoria.html?${new URLSearchParams({ cat })}`):null});
    if (subcat || special) segments.push({label:title});
    const last = window.getLastVisitedProduct?.();
    if (last) segments.push({label:last.name,href:`producto.html?id=${encodeURIComponent(last.id)}`});
    if (crumbs.dataset.catalogSnapshot !== route) {
      crumbs.replaceChildren();
      segments.forEach((segment,index) => {
        if(index) crumbs.append(window.cloneTemplate('breadcrumb-separator-template'));
        crumbs.append(window.cloneTemplate(segment.href?'breadcrumb-link-template':'breadcrumb-text-template',segment));
      });
    }
  }
  products.forEach(p => {
    if (window.updateFavoriteUI && window.isFavorite) {
      window.updateFavoriteUI(p.id, window.isFavorite(p.id));
    }
  });
}

export function initializeCatalogPage() {
  if (!document.querySelector('[data-catalog-grid]')) return;
  updateCatalogSelection();
}

// Exponer en window para compatibilidad
Object.assign(window, {
  getCatalogProducts,
  updateCatalogCounters,
  formatCatalogTitle,
  updateCatalogSelection,
  initializeCatalogPage
});

// Auto-inicializar si está en categoria.html
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCatalogPage, { once: true });
} else {
  initializeCatalogPage();
}
