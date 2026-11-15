// ==========================================================================
// APP.JS - Orquestador principal y división de código (Code Splitting)
// ==========================================================================
// 1. Carga el núcleo base común para todas las páginas
import './core.js';

// 2. Carga perezosa (Lazy Loading) de módulos especializados según la pantalla activa
async function cargarModuloPorPagina() {
  const rutaActual = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

  try {
    if (rutaActual === 'categoria.html' || rutaActual === 'index.html') {
      await import('./catalogo.js');
    } else if (rutaActual === 'producto.html') {
      await import('./resenas.js');
    } else if (rutaActual.startsWith('checkout') || rutaActual === 'carrito.html') {
      await import('./checkout.js');
    } else if (rutaActual === 'cuenta.html') {
      await import('./pedidos.js');
    }
    // Páginas como ayuda.html y politicas-retiro.html solo usan core.js
  } catch (errorCarga) {
    console.warn('Error al cargar módulo dinámico:', errorCarga);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', cargarModuloPorPagina, { once: true });
} else {
  cargarModuloPorPagina();
}
