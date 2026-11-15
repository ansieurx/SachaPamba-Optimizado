// ==========================================================================
// RESENAS.JS - Módulo especializado para reseñas de clientes y galería lightbox
// ==========================================================================

let lightboxCurrentGallery = [];
let lightboxCurrentIndex = 0;
let lightboxOpenRequest = 0;

/* Base de Datos de Opiniones y Reseñas */
    const PRODUCT_REVIEWS_DB = {
      'vitamina-c': [
        {
          name: 'Andrea Proaño',
          date: '18 de Septiembre, 2026',
          rating: 5,
          comment: 'Excelente sabor natural y no produce acidez gástrica en lo absoluto. La retiré en la González Suárez en menos de 2 horas después de pedirla por la web.',
          verified: true
        },
        {
          name: 'Patricio Benalcázar',
          date: '02 de Septiembre, 2026',
          rating: 5,
          comment: 'Se nota la pureza del camu camu silvestre. Me ha servido muchísimo para evitar los resfriados con el clima cambiante de Quito.',
          verified: true
        }
      ],
      'omega-3': [
        {
          name: 'Valeria Cárdenas',
          date: '25 de Septiembre, 2026',
          rating: 5,
          comment: 'La mejor fuente vegetal de omega. No deja regusto a pescado porque es 100% de sacha inchi puro. Recomiendo retirarlo en la botica, la atención es impecable.',
          verified: true
        }
      ],
      'cloruro-magnesio': [
        {
          name: 'Dr. Fernando Salazar',
          date: '22 de Septiembre, 2026',
          rating: 5,
          comment: 'Cristales puros de disolución rápida. Excelente para la contractura muscular y para regular el sueño. Buen precio y presentación.',
          verified: true
        }
      ],
      'jarabe-sabila': [
        {
          name: 'Mercedes Alarcón',
          date: '27 de Septiembre, 2026',
          rating: 5,
          comment: 'Alivió mi reflujo desde el tercer día. El propóleo y la miel andina le dan un sabor agradable y suave. Se agradece que no tenga químicos.',
          verified: true
        }
      ],
      'capsulas-propoleo': [
        {
          name: 'Gabriela Moncayo',
          date: '19 de Septiembre, 2026',
          rating: 5,
          comment: 'Un reconstituyente físico formidable. Me da energía limpia y protege la garganta. Excelente calidad de polen de altura.',
          verified: true
        }
      ],
      'maca': [
        {
          name: 'Mateo Roldán',
          date: '29 de Septiembre, 2026',
          rating: 5,
          comment: 'La maca gelatinizada es notablemente más suave con el estómago que la cruda. La mezclo cada mañana en mi batido y la energía dura todo el día.',
          verified: true
        }
      ],
      'cacao': [
        {
          name: 'Felipe Santillán',
          date: '20 de Septiembre, 2026',
          rating: 5,
          comment: 'Aroma profundo y notas frutales auténticas de cacao fino criollo. Sin pizca de azúcar artificial. Una joya agroecológica de Los Ríos.',
          verified: true
        }
      ],
      'sacha-inchi-polvo': [
        {
          name: 'Javier Espinosa',
          date: '12 de Septiembre, 2026',
          rating: 5,
          comment: 'Excelente proteína para después del gimnasio. Fácil digestión y perfil de aminoácidos completo. Me alegra encontrarla en Quito.',
          verified: true
        }
      ],
      'moringa': [
        {
          name: 'Cecilia Noboa',
          date: '17 de Septiembre, 2026',
          rating: 4,
          comment: 'Polvo verde muy fresco y vivo. Lo mezclo con jugo de naranja para aprovechar el hierro. Muy nutritivo y rendidor.',
          verified: true
        }
      ],
      'colageno': [
        {
          name: 'Silvia Zambrano',
          date: '28 de Septiembre, 2026',
          rating: 5,
          comment: 'Se disuelve al instante sin grumos y no sabe a nada raro gracias a la vitamina C natural de camu camu. Mis articulaciones y rodillas lo han agradecido mucho.',
          verified: true
        }
      ]
    };

    let currentReviewUploadedImage = null;

    function getPickedUpProducts() {
      const stored = localStorage.getItem('sacha_pamba_picked_up_products');
      if (stored) return JSON.parse(stored);
      const initial = ['vitamina-c'];
      localStorage.setItem('sacha_pamba_picked_up_products', JSON.stringify(initial));
      return initial;
    }

    function isProductPickedUp(productId) {
      if (getPickedUpProducts().includes(productId)) return true;
      return getAllOrders().some(order => {
        const status = (order?.status || '').trim().toLowerCase();
        if (status !== 'entregado' && status !== 'retirado') return false;
        let items = order?.items;
        if (typeof items === 'string') {
          try { items = JSON.parse(items); } catch { items = []; }
        }
        return Array.isArray(items) && items.some(item => String(item?.id || item?.pro_id || '') === String(productId));
      });
    }

    function toggleProductPickupDemo(productId) {
      let list = getPickedUpProducts();
      if (list.includes(productId)) {
        list = list.filter(id => id !== productId);
        showToast('Producto marcado como NO retirado aún', 'ph-info');
      } else {
        list.push(productId);
        showToast('¡Producto marcado como retirado en tienda física!', 'ph-seal-check');
      }
      localStorage.setItem('sacha_pamba_picked_up_products', JSON.stringify(list));
      syncCurrentPage();
    }

    function openReviewModal(productId) {
      const product = PRODUCTS.find(p => p.id === productId);
      if (!product) return;

      const user = getCurrentUser();
      const modal = document.getElementById('review-modal');
      const nameInput = document.getElementById('modal-review-name');
      const commentInput = document.getElementById('modal-review-comment');
      const prodIdInput = document.getElementById('modal-review-product-id');
      const prodNameEl = document.getElementById('review-modal-product-name');

      if (!modal) return;
      prodIdInput.value = product.id;
      if (prodNameEl) prodNameEl.textContent = `${product.name} (${product.size})`;
      if (nameInput) nameInput.value = user ? user.name : '';
      if (commentInput) commentInput.value = '';

      setModalRating(5);
      removeModalReviewImage();
      showAccessibleDialog(modal, nameInput);
    }

    function closeReviewModal() {
      const modal = document.getElementById('review-modal');
      if (modal) hideAccessibleDialog(modal);
      currentReviewUploadedImage = null;
    }

    function setModalRating(stars) {
      const ratingInput = document.getElementById('modal-review-rating');
      const label = document.getElementById('modal-rating-label');
      if (ratingInput) ratingInput.value = stars;
      if (label) label.textContent = `${stars} de 5 estrellas`;

      const buttons = document.querySelectorAll('#modal-star-picker .star-btn');
      buttons.forEach((btn, idx) => {
        btn.setAttribute('aria-label', `${idx + 1} de 5 estrellas`);
        btn.setAttribute('aria-pressed', String(idx + 1 === stars));
        const icon = btn.querySelector('i');
        if (icon) icon.className = `${idx < stars ? 'ph-fill' : 'ph'} ph-star`;
        if (idx < stars) {
          btn.className = 'star-btn text-amber-500 transition-transform active:scale-90';
        } else {
          btn.className = 'star-btn text-brand-leaf/30 hover:text-amber-500 transition-transform active:scale-90';
        }
      });
    }

    function triggerReviewFileUpload() {
      const fileInput = document.getElementById('modal-review-file');
      if (fileInput) fileInput.click();
    }

    const reviewUploadPrompt = document.getElementById('modal-review-upload-prompt');
    reviewUploadPrompt?.parentElement?.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      triggerReviewFileUpload();
    });
    reviewUploadPrompt?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        triggerReviewFileUpload();
      }
    });

    function handleModalReviewImage(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showToast('Por favor selecciona un archivo de imagen válido', 'ph-warning');
        return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        currentReviewUploadedImage = e.target.result;
        const preview = document.getElementById('modal-review-image-preview');
        const previewBox = document.getElementById('modal-review-image-preview-box');
        const uploadPrompt = document.getElementById('modal-review-upload-prompt');
        const fileNameEl = document.getElementById('modal-review-file-name');

        if (preview) preview.src = currentReviewUploadedImage;
        if (fileNameEl) fileNameEl.textContent = file.name;
        if (previewBox) previewBox.classList.remove('hidden');
        if (uploadPrompt) uploadPrompt.classList.add('hidden');
      };
      reader.readAsDataURL(file);
    }

    function removeModalReviewImage(e) {
      if (e) e.stopPropagation();
      currentReviewUploadedImage = null;
      const fileInput = document.getElementById('modal-review-file');
      const previewBox = document.getElementById('modal-review-image-preview-box');
      const uploadPrompt = document.getElementById('modal-review-upload-prompt');

      if (fileInput) fileInput.value = '';
      if (previewBox) previewBox.classList.add('hidden');
      if (uploadPrompt) uploadPrompt.classList.remove('hidden');
    }

    function submitReviewModal(e) {
      e.preventDefault();
      const productId = document.getElementById('modal-review-product-id').value;
      const rating = parseInt(document.getElementById('modal-review-rating').value) || 5;
      const name = document.getElementById('modal-review-name').value.trim();
      const comment = document.getElementById('modal-review-comment').value.trim();

      if (!productId || !name || !comment) return;

      const newReview = {
        name: name,
        date: new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' }),
        rating: rating,
        comment: comment,
        verified: true,
        image: currentReviewUploadedImage || null
      };

      const storedKey = `reviews_${productId}`;
      const existing = localStorage.getItem(storedKey) 
        ? JSON.parse(localStorage.getItem(storedKey)) 
        : (PRODUCT_REVIEWS_DB[productId] ? [...PRODUCT_REVIEWS_DB[productId]] : []);

      existing.unshift(newReview);
      localStorage.setItem(storedKey, JSON.stringify(existing));

      const container = document.getElementById('product-reviews-list');
      if (container) {
        updateProductReviews(productId);
      }

      closeReviewModal();
      showToast('¡Gracias! Tu reseña y foto han sido publicadas con éxito', 'ph-star');

      setTimeout(() => {
        const reviewsSection = document.getElementById('customer-reviews-section');
        if (reviewsSection) {
          reviewsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 250);
    }

    

export function updateLightboxImage() {
  const imgEl = document.getElementById('lightbox-main-image');
  const counterEl = document.getElementById('lightbox-counter');
  const thumbsContainer = document.getElementById('lightbox-thumbnails');
  if (!imgEl || !lightboxCurrentGallery || !lightboxCurrentGallery.length) return Promise.resolve(false);

  const currentUrl = lightboxCurrentGallery[lightboxCurrentIndex];
  imgEl.src = currentUrl;
  if (counterEl) {
    counterEl.textContent = `${lightboxCurrentIndex + 1} de ${lightboxCurrentGallery.length}`;
  }

  if (thumbsContainer) {
    thumbsContainer.innerHTML = '';
    lightboxCurrentGallery.forEach((url, i) => {
      const btn = document.createElement('button');
      btn.className = `w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === lightboxCurrentIndex ? 'border-brand-leaf ring-2 ring-brand-leaf/40 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`;
      btn.innerHTML = `<img src="${url}" alt="" class="w-full h-full object-cover">`;
      btn.onclick = () => navigateLightboxImageTo(i);
      thumbsContainer.appendChild(btn);
    });
  }
  return Promise.resolve(true);
}

export function openImageLightbox(productId, imageIndex = 0) {
  const products = window.PRODUCTS || [];
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const gallery = (product.images && product.images.length > 0) ? product.images : [product.image];
  lightboxCurrentGallery = gallery;
  lightboxCurrentIndex = Math.max(0, Math.min(gallery.length - 1, parseInt(imageIndex, 10) || 0));
  const request = ++lightboxOpenRequest;

  const modal = document.getElementById('image-lightbox-modal');
  const titleEl = document.getElementById('lightbox-product-title');
  if (titleEl) titleEl.textContent = product.name;

  return updateLightboxImage().then(shown => {
    if (!shown || request !== lightboxOpenRequest || !modal) return;
    if (window.showAccessibleDialog) window.showAccessibleDialog(modal);
  });
}

export function syncDetailGalleryImage(index) {
  const mainImg = document.getElementById('main-product-img');
  if (!mainImg || !lightboxCurrentGallery[index]) return;
  const button = document.querySelectorAll('.product-thumb-btn')[index];
  if (window.switchProductImage) return window.switchProductImage(lightboxCurrentGallery[index], button, index);
}

export function navigateLightboxImage(delta) {
  if (!lightboxCurrentGallery || lightboxCurrentGallery.length <= 1) return;
  lightboxCurrentIndex = (lightboxCurrentIndex + delta + lightboxCurrentGallery.length) % lightboxCurrentGallery.length;
  updateLightboxImage();
  syncDetailGalleryImage(lightboxCurrentIndex);
}

export function navigateLightboxImageTo(index) {
  if (!lightboxCurrentGallery || index < 0 || index >= lightboxCurrentGallery.length) return;
  lightboxCurrentIndex = index;
  updateLightboxImage();
  syncDetailGalleryImage(lightboxCurrentIndex);
}

export function closeImageLightbox() {
  lightboxOpenRequest++;
  const modal = document.getElementById('image-lightbox-modal');
  if (!modal) return;
  if (window.hideAccessibleDialog) window.hideAccessibleDialog(modal);
}

export function updateProductReviews(productId) {
  const container = document.getElementById('product-reviews-list');
  if (!container) return;

  const storedKey = `reviews_${productId}`;
  let reviews = [];
  try {
    const raw = localStorage.getItem(storedKey);
    reviews = raw ? JSON.parse(raw) : (PRODUCT_REVIEWS_DB[productId] || []);
  } catch {
    reviews = PRODUCT_REVIEWS_DB[productId] || [];
  }

  container.innerHTML = reviews.map(r => `
    <article class="p-5 rounded-2xl bg-[#CCD5AE]/20 border border-[#CCD5AE]/40 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-brand-forest text-brand-cream flex items-center justify-center font-bold text-xs uppercase">
            ${r.name ? r.name.charAt(0) : 'U'}
          </div>
          <div>
            <span class="font-bold text-brand-forest text-sm block">${r.name || 'Cliente'}</span>
            <span class="text-xs text-brand-forest/60">${r.date || ''}</span>
          </div>
        </div>
        <div class="flex text-amber-500 text-xs">
          ${'★'.repeat(r.rating || 5)}${'☆'.repeat(5 - (r.rating || 5))}
        </div>
      </div>
      <p class="text-sm text-brand-forest/90 leading-relaxed">${r.comment || ''}</p>
      ${r.image ? `<div class="mt-2"><img src="${r.image}" alt="Foto reseña" class="w-20 h-20 object-cover rounded-xl border border-brand-forest/20 cursor-pointer" onclick="openImageLightbox('${productId}')"></div>` : ''}
    </article>
  `).join('');
}

// Exponer en window para atributos HTML onclick
Object.assign(window, {
  PRODUCT_REVIEWS_DB,
  getPickedUpProducts,
  isProductPickedUp,
  toggleProductPickupDemo,
  openReviewModal,
  closeReviewModal,
  setModalRating,
  triggerReviewFileUpload,
  handleModalReviewImage,
  removeModalReviewImage,
  submitReviewModal,
  openImageLightbox,
  syncDetailGalleryImage,
  navigateLightboxImage,
  navigateLightboxImageTo,
  closeImageLightbox,
  updateLightboxImage,
  updateProductReviews
});
