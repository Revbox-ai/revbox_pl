/**
 * revbox-api.js — integracja frontendu z backendem API
 * Zastępuje hardkodowane dane w app.js prawdziwymi danymi z bazy.
 */
(function () {
  'use strict';

  const BASE = '';
  const PLACEHOLDER_IMAGES = [
    'assets/images/products/smartfon_01.jpg',
    'assets/images/products/smartfon_02.jpg',
    'assets/images/products/smartfon_03.jpg',
    'assets/images/products/01_pralka.jpg',
    'assets/images/products/02_lodowka.jpg',
    'assets/images/products/03_mikrofalowka.jpg',
    'assets/images/products/set1_01.jpg',
  ];

  function placeholderImg(id) {
    return PLACEHOLDER_IMAGES[id % PLACEHOLDER_IMAGES.length];
  }

  function getUrlParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function formatPrice(pln, eur) {
    if (pln) return Number(pln).toLocaleString('pl', { minimumFractionDigits: 2 }) + ' zł';
    if (eur) return '€' + Number(eur).toFixed(2);
    return '—';
  }

  function escHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── API HELPERS ────────────────────────────────────────────
  async function fetchProducts(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${BASE}/api/products?${qs}`);
    return r.json();
  }

  async function fetchProduct(id) {
    const r = await fetch(`${BASE}/api/products/${id}`);
    return r.json();
  }

  async function fetchCategories() {
    const r = await fetch(`${BASE}/api/categories`);
    return r.json();
  }

  // ── PRODUCT CARD — identyczna struktura jak app.js productCard() ──────
  function apiProductCard(p) {
    const img = p.image_url || placeholderImg(p.id);
    const name = escHtml(p.name_pl || p.name_en);
    const featureCount = parseInt(p.feature_count) || 0;
    const price = formatPrice(p.price_pln, p.price_eur);
    return `
      <article class="product-card product-card-no-score">
        <div class="product-card-head">
          <div class="match-label"><button class="match-help-trigger" data-modal="matchInfo" aria-label="Informacje o match score">?</button><span>Your match score</span></div>
          <button class="match-ring match-ring-empty match-ring-trigger" data-modal="noProfileInfo" aria-label="Dlaczego nie widzę match score?"><span>?</span></button>
        </div>
        <img class="product-image" src="${img}" alt="${name}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMAGES[0]}'">
        <h3>${name}</h3>
        <div class="meta"><span>Cechy</span><strong>${featureCount > 0 ? featureCount : '—'}</strong></div>
        <div class="price-line">${price}</div>
        <div class="card-actions"><a class="btn btn-outline" href="product.html?id=${p.id}">Zobacz recenzję</a></div>
      </article>`;
  }

  // ── CATEGORY PAGE ─────────────────────────────────────────
  async function initCategoryPage() {
    const grid = document.querySelector('[data-render="category-products"]');
    if (!grid) return;

    const categorySlug = getUrlParam('category') || '';
    const search = getUrlParam('search') || '';
    let currentPage = parseInt(getUrlParam('page')) || 1;

    // Load categories into sidebar
    const categories = await fetchCategories();
    renderCategorySidebar(categories, categorySlug);

    // Update title from category
    if (categorySlug && categories) {
      const cat = categories.find(c => c.slug === categorySlug);
      if (cat) {
        const h1 = document.querySelector('.page-title');
        if (h1) h1.textContent = cat.name_pl;
        document.title = `Revbox - ${cat.name_pl}`;
        const breadcrumb = document.querySelector('.breadcrumbs');
        if (breadcrumb) breadcrumb.textContent = `Produkty / ${cat.name_pl}`;
      }
    }

    // Hook search bar
    const searchInput = document.querySelector('.search-bar input[type="search"]');
    const searchBtn = document.querySelector('.search-bar button');
    if (searchInput) {
      searchInput.value = search;
      const doSearch = () => {
        const q = searchInput.value.trim();
        window.location.href = `category.html?search=${encodeURIComponent(q)}`;
      };
      searchBtn?.addEventListener('click', doSearch);
      searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
    }

    // Load products
    await loadCategoryProducts(grid, categorySlug, search, currentPage);

    // Pagination
    document.querySelector('nav.pagination')?.addEventListener('click', e => {
      if (e.target.tagName === 'A') {
        e.preventDefault();
        const p = parseInt(e.target.dataset.page);
        if (p) loadCategoryProducts(grid, categorySlug, search, p);
      }
    });
  }

  async function loadCategoryProducts(grid, categorySlug, search, page) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#888">Ładowanie produktów...</p>';
    try {
      const data = await fetchProducts({ category: categorySlug, search, page, limit: 24 });
      if (!data.products?.length) {
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#888">Brak produktów w tej kategorii.</p>';
        return;
      }
      grid.innerHTML = data.products.map(apiProductCard).join('');

      // Update pagination
      const pag = document.querySelector('nav.pagination');
      if (pag) {
        const pages = Math.ceil(data.total / 24);
        let html = '';
        for (let i = 1; i <= Math.min(pages, 8); i++) {
          html += `<a href="#" data-page="${i}" class="${i === page ? 'active' : ''}">${i}</a>`;
        }
        pag.innerHTML = html;
      }
    } catch (e) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#e63946">Błąd ładowania produktów.</p>';
    }
  }

  function renderCategorySidebar(categories, activeSlug) {
    const sidebar = document.querySelector('.category-sidebar');
    if (!sidebar || !categories) return;
    const existing = sidebar.querySelector('.feature-panel');
    const catList = document.createElement('section');
    catList.className = 'feature-panel card';
    catList.innerHTML = `
      <div class="feature-panel-head"><h2>Kategorie</h2></div>
      <div class="feature-list">
        <a href="category.html" class="feature-item ${!activeSlug ? 'active' : ''}" style="text-decoration:none">
          <span>Wszystkie</span>
          <span class="badge-count">${categories.reduce((s, c) => s + parseInt(c.product_count || 0), 0)}</span>
        </a>
        ${categories.filter(c => c.is_active).map(c => `
          <a href="category.html?category=${c.slug}" class="feature-item ${c.slug === activeSlug ? 'active' : ''}" style="text-decoration:none">
            <span>${escHtml(c.name_pl)}</span>
            <span class="badge-count">${c.product_count || 0}</span>
          </a>
        `).join('')}
      </div>`;
    if (existing) sidebar.insertBefore(catList, existing);
    else sidebar.appendChild(catList);
  }

  // ── PRODUCT DETAIL PAGE ───────────────────────────────────
  async function initProductPage() {
    const id = getUrlParam('id');
    if (!id) return;

    try {
      const [product, affiliates] = await Promise.all([
        fetchProduct(id),
        fetch(`${BASE}/api/affiliates/product/${id}`).then(r => r.json()).catch(() => []),
      ]);
      if (product.error) {
        document.querySelector('.content-column')?.insertAdjacentHTML('afterbegin',
          '<p style="padding:40px;color:#e63946">Produkt nie został znaleziony.</p>');
        return;
      }
      renderProductDetail(product);
      renderProductAffiliates(affiliates, product.name_pl || product.name_en);
    } catch (e) {
      console.error('Błąd ładowania produktu:', e);
    }
  }

  function renderProductAffiliates(affiliates, productName) {
    const block = document.querySelector('.offers-block');
    if (!block) return;

    if (!affiliates || !affiliates.length) {
      block.style.display = 'none';
      return;
    }

    const h2 = block.querySelector('h2');
    if (h2) h2.textContent = `Zamów ${productName} u naszego zaufanego partnera`;

    const html = affiliates.map(a => {
      const logo = a.shop_logo
        ? `<img src="${escHtml(a.shop_logo)}" alt="${escHtml(a.shop_name)}" style="max-height:42px;max-width:104px;object-fit:contain">`
        : `<strong>${escHtml(a.shop_name)}</strong>`;
      const details = a.price_with_shipping
        ? `Z wysyłką: ${Number(a.price_with_shipping).toFixed(2)} zł`
        : (a.delivery_note || '');
      const delivery = a.delivery_time || '';
      const price = a.price_pln ? `${Number(a.price_pln).toFixed(2)} zł` : '';
      return `<article class="offer-row">
        <div class="offer-brand">${logo}</div>
        <div class="offer-content">${escHtml(a.delivery_note || a.shop_name)}</div>
        <div class="offer-price">
          ${price ? `<strong>${price}</strong>` : ''}
          ${details ? `<div class="muted small">${escHtml(details)}</div>` : ''}
          ${delivery ? `<div class="offer-delivery small">${escHtml(delivery)}</div>` : ''}
          <a class="btn" href="${escHtml(a.product_url)}" target="_blank" rel="noopener">Idź do sklepu</a>
        </div>
      </article>`;
    }).join('');

    block.querySelectorAll('[data-render="offers"], [data-render="offers-modal"]').forEach(el => {
      el.innerHTML = html;
    });
  }

  function renderProductDetail(p) {
    const name = p.name_pl || p.name_en;
    const price = formatPrice(p.price_pln, p.price_eur);
    const img = p.image_url || placeholderImg(p.id);

    // Page title
    document.title = `${name} recenzja, wady i zalety`;
    document.querySelectorAll('h1').forEach(el => { el.textContent = `${name} recenzja, wady i zalety`; });
    document.querySelectorAll('.breadcrumbs').forEach(el => {
      el.textContent = `Produkty / ${p.category_name || 'Wszystkie'} / ${name}`;
    });
    document.querySelectorAll('.page-subtitle').forEach(el => {
      el.textContent = p.category_name || '';
    });

    // Product image
    const imgs = document.querySelectorAll('.gallery-box img, .hero-img img');
    imgs.forEach(el => { el.src = img; el.alt = name; });

    // Price
    document.querySelectorAll('.product-price, .price-value').forEach(el => { el.textContent = price; });

    // Description
    if (p.description_pl) {
      const descEl = document.querySelector('.summary-box p');
      if (descEl) descEl.textContent = p.description_pl;
    }

    // Review count
    const totalMentions = (p.features || []).reduce((s, f) => s + (f.mention_count || 0), 0);
    document.querySelectorAll('.summary-note strong').forEach(el => {
      el.textContent = totalMentions.toLocaleString('pl');
    });

    // Features (pros/cons)
    renderProductFeatures(p.features || [], p.id);

    // External link
    if (p.url) {
      document.querySelectorAll('[data-modal="offersModal"], .offer-link').forEach(el => {
        el.href = p.url;
        el.target = '_blank';
      });
    }
  }

  function renderProductFeatures(features, productId) {
    const pros = features.filter(f => f.sentiment === 'positive').sort((a, b) => b.mention_count - a.mention_count);
    const cons = features.filter(f => f.sentiment === 'negative').sort((a, b) => b.mention_count - a.mention_count);

    if (!pros.length && !cons.length) return;

    const maxCount = Math.max(...features.map(f => f.mention_count), 1);

    function featureItem(f, cls = '') {
      const pct = Math.min(100, Math.round((f.mention_count / maxCount) * 95));
      const quoteBtn = `<button class="insight-quote-link" data-quote-feature="${escHtml(f.feature_en)}">Cytaty</button>`;
      return `<div class="insight-item ${cls}">
        <span class="insight-title">${escHtml(f.feature_en)}</span>
        <span class="insight-track"><i style="width:${pct}%"></i></span>
        <span class="insight-meta"><span class="insight-count">${f.mention_count} wzmianek</span>${quoteBtn}</span>
      </div>`;
    }

    const insightSection = document.querySelector('.feature-insights');
    if (!insightSection) return;

    insightSection.innerHTML = `
      <div class="insight-group">
        <h3>Zalety</h3>
        <div class="insight-list">
          ${pros.slice(0, 15).map(f => featureItem(f)).join('') || '<p style="color:#888;padding:8px">Brak danych o zaletach.</p>'}
        </div>
      </div>
      <div class="insight-group">
        <h3>Wady</h3>
        <div class="insight-list">
          ${cons.slice(0, 10).map(f => featureItem(f, 'negative')).join('') || '<p style="color:#888;padding:8px">Brak danych o wadach.</p>'}
        </div>
      </div>`;

    // Przechwytuj klik PRZED app.js (stopPropagation) i ładuj cytaty z API
    insightSection.addEventListener('click', e => {
      const btn = e.target.closest('[data-quote-feature]');
      if (!btn) return;
      e.stopPropagation();
      e.preventDefault();
      const featureName = btn.dataset.quoteFeature;
      if (typeof ensureQuotesModal === 'function') ensureQuotesModal();
      const modal = document.getElementById('quotesModal');
      if (!modal) return;
      const list = modal.querySelector('[data-quote-list]');
      const title = modal.querySelector('h3');
      if (title) title.textContent = `Cytaty: ${featureName}`;
      if (list) list.innerHTML = '<p style="color:#aaa;padding:8px 0">Ładowanie cytatów...</p>';
      if (typeof openModal === 'function') openModal('quotesModal');
      else modal.classList.add('active');
      fetch(`/api/products/${productId}/quotes?feature=${encodeURIComponent(featureName)}`)
        .then(r => r.json())
        .then(quotes => {
          if (!list) return;
          if (!quotes.length) {
            list.innerHTML = '<p style="color:#aaa;padding:8px 0">Brak cytatów dla tej cechy.</p>';
            return;
          }
          list.innerHTML = quotes.map(q =>
            `<div class="quote-row"><p>"${escHtml(q.quote_en)}"</p></div>`
          ).join('');
        })
        .catch(() => { if (list) list.innerHTML = '<p style="color:#e63946;padding:8px 0">Błąd ładowania cytatów.</p>'; });
    });
  }

  // ── INDEX PAGE ────────────────────────────────────────────
  async function initIndexPage() {
    // Replace hardcoded featured products with real ones
    const featuredContainers = document.querySelectorAll('[data-render="featured-phones"]');
    if (!featuredContainers.length) return;
    try {
      const data = await fetchProducts({ featured: 'true', limit: 5 });
      const fallback = await fetchProducts({ limit: 5 }); // if no featured products
      const items = data.products?.length ? data.products : fallback.products || [];
      featuredContainers.forEach(el => { el.innerHTML = items.map(apiProductCard).join(''); });
    } catch (e) { /* ignore, keep static fallback */ }
  }

  // ── INIT ──────────────────────────────────────────────────
  function init() {
    const page = document.body.dataset.page;
    if (page === 'category') initCategoryPage();
    else if (page === 'product') initProductPage();
    else if (page === 'index' || !page) initIndexPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
