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

  // ── SESSION (anonimowy UUID zapisany w localStorage) ──────
  function getSessionId() {
    let sid = localStorage.getItem('revbox_sid');
    if (!sid) {
      sid = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
          });
      localStorage.setItem('revbox_sid', sid);
    }
    return sid;
  }

  // ── MATCH SCORE (identyczny algorytm jak src/services/matchScore.js) ──
  function calculateMatchScore(features, opts = {}) {
    const lf = opts.lambdaFeature ?? 0.05;
    const lp = opts.lambdaProduct  ?? 0.01;
    const beta = opts.beta          ?? 0.10;
    let wSum = 0, wTotal = 0, totalOp = 0;
    for (const f of features) {
      const pos = Math.max(0, Number(f.positive || 0));
      const neg = Math.max(0, Number(f.negative || 0));
      const w   = Math.max(0, Number(f.weight  ?? 1));
      const tot = pos + neg;
      totalOp += tot;
      let sent = 0, conf = 0;
      if (tot > 0) { sent = (pos - neg) / tot; conf = 1 - Math.exp(-lf * tot); }
      wSum   += w * sent * conf;
      wTotal += w;
    }
    const raw   = wTotal > 0 ? wSum / wTotal : 0;
    const power = totalOp > 0 ? 1 - Math.exp(-lp * totalOp) : 0;
    const final = raw * (1 + beta * power);
    const clamped = Math.max(-1, Math.min(1, final));
    return Math.round(((clamped + 1) / 2) * 100);
  }

  // ── PREFERENCES API ────────────────────────────────────────
  async function loadCategoryFeatures(categoryId) {
    try {
      const url = categoryId === 0
        ? `${BASE}/api/features/all`
        : `${BASE}/api/features/category/${categoryId}`;
      const r = await fetch(url);
      return r.ok ? r.json() : [];
    } catch { return []; }
  }

  async function loadUserPrefs(sessionId, categoryId) {
    try {
      if (categoryId === 0) {
        // Wszystkie preferencje sesji (across all categories)
        const r = await fetch(`${BASE}/api/preferences/${sessionId}`);
        if (!r.ok) return [];
        const map = await r.json(); // { catId: [feature_en, ...], ... }
        const all = Object.values(map).flat();
        return [...new Set(all)];
      }
      const r = await fetch(`${BASE}/api/preferences/${sessionId}/${categoryId}`);
      return r.ok ? r.json() : [];
    } catch { return []; }
  }

  async function togglePreference(sessionId, categoryId, featureEn, enabled) {
    try {
      await fetch(`${BASE}/api/preferences/${sessionId}/${categoryId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_en: featureEn, enabled }),
      });
    } catch { /* ignoruj błędy sieciowe */ }
  }

  // Renderuje listę cech z toggleami w podanym kontenerze.
  // Zwraca aktualny Set zaznaczonych cech.
  function renderFeatureToggles(container, features, userPrefs, categoryId, sessionId, onChangeCallback, showCount) {
    if (!container) return new Set();
    const prefSet = new Set(userPrefs);
    const PAGE = showCount ?? 20;
    let currentLimit = PAGE;
    let query = '';

    const panel = container.closest('.feature-panel');

    // Wstrzyknij search input (raz)
    if (panel && !panel.querySelector('.feature-search')) {
      const searchEl = document.createElement('input');
      searchEl.type = 'search';
      searchEl.className = 'feature-search';
      searchEl.placeholder = 'Szukaj cechy...';
      searchEl.addEventListener('input', () => {
        query = searchEl.value.trim().toLowerCase();
        currentLimit = PAGE; // reset paginacji przy nowym wyszukiwaniu
        render();
      });
      container.before(searchEl);
    }

    const render = () => {
      const base = query
        ? features.filter(f => f.feature_en.toLowerCase().includes(query))
        : features;
      const checked   = base.filter(f => prefSet.has(f.feature_en));
      const unchecked = base.filter(f => !prefSet.has(f.feature_en));
      const sorted = [...checked, ...unchecked];
      const visible = query ? sorted : [...checked, ...unchecked.slice(0, Math.max(0, currentLimit - checked.length))];

      container.innerHTML = visible.map(f => `
        <label class="feature-item">
          <input type="checkbox" value="${escHtml(f.feature_en)}" ${prefSet.has(f.feature_en) ? 'checked' : ''}>
          <span>${escHtml(f.feature_en)}</span>
        </label>`).join('');

      if (!visible.length) {
        container.innerHTML = '<p style="font-size:13px;color:#aaa;padding:4px 0">Brak wyników</p>';
      }

      container.querySelectorAll('input[type=checkbox]').forEach(input => {
        input.addEventListener('change', async () => {
          const fn = input.value;
          input.checked ? prefSet.add(fn) : prefSet.delete(fn);
          render(); // natychmiast przesuń zaznaczoną cechę na górę
          localStorage.setItem('revbox_last_cat', categoryId);
          await togglePreference(sessionId, categoryId, fn, input.checked);
          if (typeof onChangeCallback === 'function') onChangeCallback(prefSet);
        });
      });

      // Load more button
      const loadMoreBtn = panel?.querySelector('[data-load-features]');
      if (loadMoreBtn) {
        const shownUnchecked = Math.min(unchecked.length, Math.max(0, currentLimit - checked.length));
        const allShown = query || shownUnchecked >= unchecked.length;
        loadMoreBtn.style.display = allShown ? 'none' : '';
        if (!allShown) {
          const remaining = unchecked.length - shownUnchecked;
          loadMoreBtn.textContent = `Wczytaj więcej (${remaining})`;
          loadMoreBtn.onclick = () => {
            currentLimit += PAGE;
            render();
          };
        }
      }
    };

    render();
    return prefSet;
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
    const matchScore = p.match_score != null ? Math.round(parseFloat(p.match_score)) : null;
    const totalMentions = parseInt(p.total_mentions) || 0;
    return `
      <article class="product-card product-card-no-score" data-product-id="${p.id}">
        <div class="product-card-head">
          <div class="match-label"><button class="match-help-trigger" data-modal="matchInfo" aria-label="Informacje o match score">?</button><span>Your match score</span></div>
          <button class="match-ring match-ring-empty match-ring-trigger" data-modal="noProfileInfo" aria-label="Dlaczego nie widzę match score?"><span>?</span></button>
        </div>
        <img class="product-image" src="${img}" alt="${name}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMAGES[0]}'">
        <h3>${name}</h3>
        <div class="meta-wrap"><button class="score-help-btn" data-score-help="1" aria-label="Co to jest Revbox Score?">?</button><div class="meta"><span>Revbox score</span><strong>${matchScore !== null ? matchScore + '%' : '—'}</strong></div></div>
        <div class="price-line">Przeanalizowano <strong>${totalMentions > 0 ? totalMentions.toLocaleString('pl') : '—'}</strong> wzmianek</div>
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
    let priceMin = getUrlParam('price_min') ? parseFloat(getUrlParam('price_min')) : null;
    let priceMax = getUrlParam('price_max') ? parseFloat(getUrlParam('price_max')) : null;
    let sortField = '';
    let sortDir   = 'desc';

    // Load categories into sidebar
    const categories = await fetchCategories();
    renderCategorySidebar(categories, categorySlug);

    // Update title from category
    let activeCat = null;
    if (categorySlug && categories) {
      activeCat = categories.find(c => c.slug === categorySlug);
      if (activeCat) {
        const h1 = document.querySelector('.page-title');
        if (h1) h1.textContent = activeCat.name_pl;
        document.title = `Revbox - ${activeCat.name_pl}`;
        const breadcrumb = document.querySelector('.breadcrumbs');
        if (breadcrumb) breadcrumb.textContent = `Produkty / ${activeCat.name_pl}`;
      }
    }

    // Load features + user prefs for category sidebar
    const sid = getSessionId();
    if (activeCat) localStorage.setItem('revbox_last_cat', activeCat.id);
    let currentPrefSet = new Set();
    const effectiveCatId = activeCat ? activeCat.id : 0; // 0 = "Wszystkie"

    const [catFeatures, userPrefs] = await Promise.all([
      loadCategoryFeatures(effectiveCatId),
      loadUserPrefs(sid, effectiveCatId),
    ]);
    // Helper: ładuje produkty i od razu aktualizuje match scores
    const loadAndScore = async (page, pMin, pMax, sField, sDir) => {
      await loadCategoryProducts(grid, categorySlug, search, page, pMin, pMax, sField, sDir);
      if (currentPrefSet.size) {
        await updateProductRingsFromBatch(grid, effectiveCatId, sid, currentPrefSet);
        sortGridByScore(grid);
      }
    };

    const featureContainer = document.querySelector('[data-render="features"]');
    if (catFeatures.length) {
      currentPrefSet = renderFeatureToggles(featureContainer, catFeatures, userPrefs, effectiveCatId, sid,
        async (updatedPrefSet) => {
          currentPrefSet = updatedPrefSet;
          await updateProductRingsFromBatch(grid, effectiveCatId, sid, updatedPrefSet);
          sortGridByScore(grid);
        }
      );
    }

    // Price filter inputs
    const priceMinInput = document.getElementById('price-min');
    const priceMaxInput = document.getElementById('price-max');
    const priceFilterBtn = document.getElementById('price-filter-btn');
    const priceFilterClear = document.getElementById('price-filter-clear');

    if (priceMinInput && priceMin) priceMinInput.value = priceMin;
    if (priceMaxInput && priceMax) priceMaxInput.value = priceMax;
    if (priceFilterClear && (priceMin || priceMax)) priceFilterClear.style.display = '';

    priceFilterBtn?.addEventListener('click', () => {
      priceMin = priceMinInput.value ? parseFloat(priceMinInput.value) : null;
      priceMax = priceMaxInput.value ? parseFloat(priceMaxInput.value) : null;
      if (priceFilterClear) priceFilterClear.style.display = (priceMin || priceMax) ? '' : 'none';
      renderFilterTags(activeCat, priceMin, priceMax);
      updateBucketActive(priceMax);
      loadAndScore(1, priceMin, priceMax, sortField, sortDir);
    });

    priceFilterClear?.addEventListener('click', () => {
      priceMin = null; priceMax = null;
      if (priceMinInput) priceMinInput.value = '';
      if (priceMaxInput) priceMaxInput.value = '';
      priceFilterClear.style.display = 'none';
      renderFilterTags(activeCat, null, null);
      updateBucketActive(null);
      loadAndScore(1, null, null, sortField, sortDir);
    });

    // Bucket buttons
    document.getElementById('bucket-grid')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-price-max]');
      if (!btn) return;
      const max = parseFloat(btn.dataset.priceMax);
      // Toggle off if already active
      if (priceMax === max && !priceMin) {
        priceMax = null;
      } else {
        priceMax = max;
        priceMin = null;
        if (priceMinInput) priceMinInput.value = '';
      }
      if (priceMaxInput) priceMaxInput.value = priceMax || '';
      if (priceFilterClear) priceFilterClear.style.display = priceMax ? '' : 'none';
      renderFilterTags(activeCat, priceMin, priceMax);
      updateBucketActive(priceMax);
      loadAndScore(1, priceMin, priceMax, sortField, sortDir);
    });

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

    // Expose clear-price for filter-tag × click
    window.__revboxClearPrice = () => {
      priceMin = null; priceMax = null;
      if (priceMinInput) priceMinInput.value = '';
      if (priceMaxInput) priceMaxInput.value = '';
      if (priceFilterClear) priceFilterClear.style.display = 'none';
      renderFilterTags(activeCat, null, null);
      updateBucketActive(null);
      loadAndScore(1, null, null, sortField, sortDir);
    };

    // Render initial state
    renderFilterTags(activeCat, priceMin, priceMax);
    updateBucketActive(priceMax);

    // Sort dropdowns
    const sortFieldEl = document.getElementById('sort-field');
    const sortDirEl   = document.getElementById('sort-dir');
    const onSortChange = () => {
      sortField = sortFieldEl?.value || '';
      sortDir   = sortDirEl?.value  || 'desc';
      loadAndScore(1, priceMin, priceMax, sortField, sortDir);
    };
    sortFieldEl?.addEventListener('change', onSortChange);
    sortDirEl?.addEventListener('change', onSortChange);

    // Load products + score
    await loadAndScore(currentPage, priceMin, priceMax, sortField, sortDir);

    // Pagination
    document.querySelector('nav.pagination')?.addEventListener('click', e => {
      if (e.target.tagName === 'A') {
        e.preventDefault();
        const p = parseInt(e.target.dataset.page);
        if (p) loadAndScore(p, priceMin, priceMax, sortField, sortDir);
      }
    });
  }

  function renderFilterTags(cat, priceMin, priceMax) {
    const container = document.querySelector('.filter-tags');
    if (!container) return;
    const tags = [];
    if (cat) {
      tags.push(`<span style="cursor:pointer" onclick="window.location.href='category.html'">${escHtml(cat.name_pl)} ×</span>`);
    }
    if (priceMin && priceMax) {
      tags.push(`<span style="cursor:pointer" onclick="window.__revboxClearPrice && window.__revboxClearPrice()">${priceMin} – ${priceMax} zł ×</span>`);
    } else if (priceMax) {
      tags.push(`<span style="cursor:pointer" onclick="window.__revboxClearPrice && window.__revboxClearPrice()">do ${priceMax} zł ×</span>`);
    } else if (priceMin) {
      tags.push(`<span style="cursor:pointer" onclick="window.__revboxClearPrice && window.__revboxClearPrice()">od ${priceMin} zł ×</span>`);
    }
    container.innerHTML = tags.join('');
    const head = container.closest('.section-head')?.querySelector('.eyebrow');
    if (head) head.textContent = tags.length ? 'Filtry' : 'Produkty';
  }

  function updateBucketActive(priceMax) {
    document.querySelectorAll('#bucket-grid .bucket-btn').forEach(btn => {
      btn.classList.toggle('active', priceMax !== null && parseFloat(btn.dataset.priceMax) === priceMax);
    });
  }

  async function loadCategoryProducts(grid, categorySlug, search, page, priceMin, priceMax, sortField, sortDir) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#888">Ładowanie produktów...</p>';
    try {
      const params = { category: categorySlug, search, page, limit: 24 };
      if (priceMin) params.price_pln_min = priceMin;
      if (priceMax) params.price_pln_max = priceMax;
      if (sortField) { params.sort = sortField; params.dir = sortDir || 'desc'; }
      const data = await fetchProducts(params);
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

  // Sortuje karty w gridzie: ze scorem (malejąco) na górze, bez scoru na dole
  function sortGridByScore(grid) {
    const cards = [...grid.querySelectorAll('[data-product-id]')];
    if (cards.length < 2) return;
    cards.sort((a, b) => {
      const aRing = a.querySelector('.match-ring');
      const bRing = b.querySelector('.match-ring');
      const aScore = (!aRing || aRing.classList.contains('match-ring-empty'))
        ? -1 : parseInt(aRing.style.getPropertyValue('--score') || '0');
      const bScore = (!bRing || bRing.classList.contains('match-ring-empty'))
        ? -1 : parseInt(bRing.style.getPropertyValue('--score') || '0');
      return bScore - aScore;
    });
    cards.forEach(c => grid.appendChild(c));
  }

  function clearAllProductRings(grid) {
    grid.querySelectorAll('[data-product-id]').forEach(card => {
      const ring = card.querySelector('.match-ring');
      if (!ring) return;
      ring.className = 'match-ring match-ring-empty match-ring-trigger';
      ring.style.removeProperty('--score');
      ring.innerHTML = '<span>?</span>';
      ring.setAttribute('data-modal', 'noProfileInfo');
      card.classList.add('product-card-no-score');
    });
  }

  // Aktualizuje ringi match score na kartach po batch computation
  async function updateProductRingsFromBatch(grid, categoryId, sessionId, prefSet) {
    if (!prefSet.size) { clearAllProductRings(grid); return; }
    const cards = grid.querySelectorAll('[data-product-id]');
    if (!cards.length) return;
    const productIds = [...cards].map(c => parseInt(c.dataset.productId)).filter(Boolean);

    try {
      const r = await fetch(`${BASE}/api/preferences/match-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, categoryId, productIds }),
      });
      const scores = await r.json();
      for (const card of cards) {
        const pid = parseInt(card.dataset.productId);
        const score = scores[pid];
        const ring = card.querySelector('.match-ring');
        if (!ring) continue;
        if (score !== null && score !== undefined) {
          ring.className = 'match-ring';
          ring.style.setProperty('--score', Math.round(score));
          ring.innerHTML = `<span>${Math.round(score)}<small>%</small></span>`;
          ring.removeAttribute('data-modal');
          card.classList.remove('product-card-no-score');
        } else {
          ring.className = 'match-ring match-ring-empty match-ring-trigger';
          ring.style.removeProperty('--score');
          ring.innerHTML = '<span>?</span>';
          ring.setAttribute('data-modal', 'noProfileInfo');
          card.classList.add('product-card-no-score');
        }
      }
    } catch { /* ignoruj */ }
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

      // Cechy kategorii + preferencje użytkownika w sidebarze
      if (product.category_id) {
        const sid = getSessionId();
        localStorage.setItem('revbox_last_cat', product.category_id);
        const [catFeatures, userPrefs] = await Promise.all([
          loadCategoryFeatures(product.category_id),
          loadUserPrefs(sid, product.category_id),
        ]);

        const featureContainer = document.querySelector('[data-render="features"]');
        if (catFeatures.length) {
          const prefSet = renderFeatureToggles(
            featureContainer, catFeatures, userPrefs, product.category_id, sid,
            (ps) => updateProductDetailRing(product.features || [], ps)
          );
          if (prefSet.size) updateProductDetailRing(product.features || [], prefSet);
        }
      }
    } catch (e) {
      console.error('Błąd ładowania produktu:', e);
    }
  }

  function updateProductDetailRing(productFeatures, prefSet) {
    const ring = document.querySelector('.score-circle');
    if (!ring) return;
    if (!prefSet.size) {
      ring.style.removeProperty('--score');
      const inner = ring.querySelector('[data-score-Wartość]');
      if (inner) inner.textContent = '?';
      return;
    }
    // Grupuj cechy produktu po feature_en (positive/negative)
    const featureMap = {};
    for (const f of productFeatures) {
      if (!featureMap[f.feature_en]) featureMap[f.feature_en] = { positive: 0, negative: 0 };
      if (f.sentiment === 'positive') featureMap[f.feature_en].positive += (f.mention_count || 0);
      else featureMap[f.feature_en].negative += (f.mention_count || 0);
    }
    const scored = [...prefSet].map(fe => ({
      feature_en: fe,
      positive: featureMap[fe]?.positive || 0,
      negative: featureMap[fe]?.negative || 0,
    }));
    const score = calculateMatchScore(scored);
    ring.style.setProperty('--score', score);
    const inner = ring.querySelector('[data-score-Wartość]');
    if (inner) inner.textContent = score;
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
        ? `<img src="${escHtml(a.shop_logo)}" alt="${escHtml(a.shop_name)}" style="max-height:63px;max-width:156px;object-fit:contain">`
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
    document.querySelectorAll('.sidebar .page-title').forEach(el => { el.textContent = name; });
    document.querySelectorAll('.summary-box h2').forEach(el => { el.textContent = `Recenzja ${name}`; });
    document.querySelectorAll('.seo-box h2').forEach(el => { el.textContent = `Co o ${name} mówią użytkownicy`; });
    if (p.seo_text_pl) {
      const seoBox = document.querySelector('.seo-box');
      if (seoBox) {
        const h2 = seoBox.querySelector('h2');
        seoBox.innerHTML = '';
        if (h2) seoBox.appendChild(h2);
        const article = document.createElement('article');
        article.innerHTML = p.seo_text_pl;
        seoBox.appendChild(article);
      }
    }
    document.querySelectorAll('.breadcrumbs').forEach(el => {
      const catLink = p.category_slug
        ? `<a href="category.html?category=${p.category_slug}">${escHtml(p.category_name)}</a>`
        : `<a href="category.html">Wszystkie</a>`;
      el.innerHTML = `<a href="category.html">Produkty</a> / ${catLink} / ${escHtml(name)}`;
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

    // Match Score (algorytm sentyment × wiarygodność)
    const matchScore = p.match_score != null ? Math.round(parseFloat(p.match_score)) : null;
    document.querySelectorAll('.summary-score-row strong').forEach(el => {
      el.textContent = matchScore !== null ? `Revbox score ${matchScore}%` : 'Revbox score —';
    });

    // Features (pros/cons)
    renderProductFeatures(p.features || [], p.id, name);

    // External link
    if (p.url) {
      document.querySelectorAll('[data-modal="offersModal"], .offer-link').forEach(el => {
        el.href = p.url;
        el.target = '_blank';
      });
    }
  }

  function renderProductFeatures(features, productId, productName) {
    const pros = features.filter(f => f.sentiment === 'positive').sort((a, b) => b.mention_count - a.mention_count);
    const cons = features.filter(f => f.sentiment === 'negative').sort((a, b) => b.mention_count - a.mention_count);

    if (!pros.length && !cons.length) return;

    const SHOW = 8; // 4 kolumny × 2 rzędy
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

    function groupHtml(list, label, key, cls) {
      if (!list.length) return '';
      const total = list.reduce((s, f) => s + (f.mention_count || 0), 0);
      const isNeg = key === 'cons';
      const countSpan = `<span style="font-size:.75em;font-weight:500;color:${isNeg ? '#e63946' : '#2e7d32'};margin-left:.4em">(${total})</span>`;
      const items = list.map((f, i) =>
        featureItem(f, [cls, i >= SHOW ? 'insight-hidden' : ''].filter(Boolean).join(' '))
      ).join('');
      const hasMore = list.length > SHOW;
      return `<div class="insight-group">
        <h2>${label}${countSpan}</h2>
        <div class="insight-list" data-igroup="${key}">${items}</div>
        ${hasMore ? `<div class="insight-expand-wrap"><button class="btn btn-outline insight-expand" data-igroup="${key}">Pokaż więcej cech</button></div>` : ''}
      </div>`;
    }

    const insightSection = document.querySelector('.feature-insights');
    if (!insightSection) return;

    insightSection.innerHTML =
      groupHtml(pros, `Zalety ${productName}`, 'pros', '') +
      (cons.length ? groupHtml(cons, `Wady ${productName}`, 'cons', 'negative') : '');

    // Expand/collapse dla każdej grupy
    insightSection.querySelectorAll('.insight-expand').forEach(btn => {
      const key = btn.dataset.igroup;
      const listEl = insightSection.querySelector(`.insight-list[data-igroup="${key}"]`);
      btn.addEventListener('click', () => {
        const expanded = listEl.classList.toggle('insight-expanded');
        btn.textContent = expanded ? 'Zwiń wszystkie cechy' : 'Pokaż więcej cech';
      });
    });

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
    const catList = document.querySelector('[data-render="index-categories"]');
    const featuredContainers = document.querySelectorAll('[data-render="featured-phones"]');

    const [categories] = await Promise.all([
      fetchCategories().catch(() => []),
    ]);

    if (catList && categories?.length) {
      catList.innerHTML = categories
        .filter(c => c.is_active)
        .map(c => `<li><a href="category.html?category=${encodeURIComponent(c.slug)}">${escHtml(c.name_pl)}</a></li>`)
        .join('');
    }

    if (featuredContainers.length) {
      try {
        const data = await fetchProducts({ featured: 'true', limit: 5 });
        const fallback = await fetchProducts({ limit: 5 });
        const items = data.products?.length ? data.products : fallback.products || [];
        featuredContainers.forEach(el => { el.innerHTML = items.map(apiProductCard).join(''); });
      } catch (e) { /* ignore */ }
    }
  }

  // ── PROFILE PAGE ──────────────────────────────────────────
  async function initProfilePage() {
    const selectEl = document.getElementById('profile-cat-select');
    const featWrap = document.getElementById('profile-features-wrap');
    if (!selectEl || !featWrap) return;

    const sid = getSessionId();
    const categories = await fetchCategories();
    if (!categories?.length) return;

    const activeCats = categories.filter(c => c.is_active);
    const lastCatId  = parseInt(localStorage.getItem('revbox_last_cat'));
    let activeCatId  = parseInt(getUrlParam('category')) || (lastCatId && activeCats.find(c => c.id === lastCatId) ? lastCatId : null) || activeCats[0]?.id;

    // Wypełnij dropdown
    selectEl.innerHTML = activeCats.map(c =>
      `<option value="${c.id}"${c.id === activeCatId ? ' selected' : ''}>${escHtml(c.name_pl)}</option>`
    ).join('');
    selectEl.addEventListener('change', () => {
      activeCatId = parseInt(selectEl.value);
      loadProfileCategory();
    });

    const loadProfileCategory = async () => {
      featWrap.innerHTML = '<p style="padding:24px;color:#888">Ładowanie cech...</p>';

      const cat = activeCats.find(c => c.id === activeCatId);
      const [features, userPrefs] = await Promise.all([
        loadCategoryFeatures(activeCatId),
        loadUserPrefs(sid, activeCatId),
      ]);

      if (!features.length) {
        featWrap.innerHTML = '<p style="padding:24px;color:#888">Brak danych dla tej kategorii.</p>';
        return;
      }

      featWrap.innerHTML = `
        <div class="feature-panel card profile-feature-panel">
          <div class="feature-panel-head">
            <p>Stwórz swój profil preferencji dla kategorii: <strong>${escHtml(cat?.name_pl || '')}</strong></p>
          </div>
          <p class="muted" style="padding:0 0 12px">Zaznacz cechy produktów, które są dla Ciebie ważne a Revbox wskaże produkty najlepiej dopasowane do Twoich preferencji.</p>
          <div class="feature-list" id="profile-feat-list"></div>
          <div style="text-align:center;margin-top:16px"><button class="btn btn-outline" data-load-features>Wczytaj więcej</button></div>
        </div>`;

      renderFeatureToggles(
        document.getElementById('profile-feat-list'),
        features, userPrefs, activeCatId, sid, null, 45
      );
    };

    await loadProfileCategory();
  }

  // ── AUTH API ──────────────────────────────────────────────
  async function checkUserSession() {
    try {
      const r = await fetch('/api/auth/me');
      return r.ok ? r.json() : { loggedIn: false };
    } catch { return { loggedIn: false }; }
  }

  async function loginUser(email, password) {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return r.json();
  }

  async function registerUser(email, username, password) {
    const r = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    });
    return r.json();
  }

  async function logoutUser() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
  }

  function updateHeaderAuth(user) {
    const nav = document.querySelector('.header-actions');
    if (!nav) return;
    const loginLink = Array.from(nav.querySelectorAll('a')).find(a => a.textContent.trim() === 'Zaloguj');
    if (!loginLink) return;

    if (user && user.loggedIn) {
      loginLink.outerHTML =
        `<span class="header-auth-user">Cześć, <strong>${escHtml(user.username)}</strong></span>` +
        `<a href="#" id="header-logout-btn" class="header-auth-logout">Wyloguj</a>`;
      document.querySelector('#header-logout-btn')?.addEventListener('click', async e => {
        e.preventDefault();
        await logoutUser();
        updateHeaderAuth(null);
      });
    } else {
      const existing = nav.querySelector('#header-logout-btn');
      const userSpan = nav.querySelector('.header-auth-user');
      if (existing) existing.remove();
      if (userSpan) userSpan.remove();
      const link = nav.querySelector('a') || document.createElement('a');
      if (!link.id) {
        link.textContent = 'Zaloguj';
        link.href = '#';
      }
      link.onclick = e => { e.preventDefault(); openAuthModal('login'); };
    }
  }

  // ── AUTH MODAL ────────────────────────────────────────────
  function ensureAuthModal() {
    if (document.getElementById('auth-modal-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'auth-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px';
    overlay.innerHTML = `
      <div id="auth-modal" style="background:#fff;border-radius:16px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,.3);overflow:hidden">
        <div style="padding:20px 24px 0;border-bottom:1px solid #eee">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
            <h2 id="auth-modal-title" style="font-size:18px;font-weight:700;color:#1a1a2e">Zaloguj się</h2>
            <button id="auth-modal-close" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888;line-height:1">&times;</button>
          </div>
          <div style="display:flex;gap:0;border-bottom:2px solid #f0f0f0;margin:0 -24px;padding:0 24px">
            <button id="auth-tab-login" class="auth-tab auth-tab-active" style="padding:8px 16px;border:none;background:none;cursor:pointer;font-size:14px;font-weight:600;color:#f7b321;border-bottom:2px solid #f7b321;margin-bottom:-2px">Zaloguj się</button>
            <button id="auth-tab-register" class="auth-tab" style="padding:8px 16px;border:none;background:none;cursor:pointer;font-size:14px;color:#888;border-bottom:2px solid transparent;margin-bottom:-2px">Zarejestruj się</button>
          </div>
        </div>
        <div style="padding:24px">
          <div id="auth-login-form">
            <div style="margin-bottom:14px">
              <label style="display:block;font-size:13px;font-weight:500;color:#555;margin-bottom:5px">Email</label>
              <input id="auth-login-email" type="email" placeholder="twoj@email.pl" style="width:100%;padding:9px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;outline:none">
            </div>
            <div style="margin-bottom:20px">
              <label style="display:block;font-size:13px;font-weight:500;color:#555;margin-bottom:5px">Hasło</label>
              <input id="auth-login-pass" type="password" placeholder="••••••••" style="width:100%;padding:9px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;outline:none">
            </div>
            <div id="auth-login-error" style="color:#c62828;font-size:13px;margin-bottom:12px;display:none"></div>
            <button id="auth-login-submit" style="width:100%;padding:11px;background:#f7b321;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">Zaloguj się</button>
          </div>
          <div id="auth-register-form" style="display:none">
            <div style="margin-bottom:14px">
              <label style="display:block;font-size:13px;font-weight:500;color:#555;margin-bottom:5px">Email</label>
              <input id="auth-reg-email" type="email" placeholder="twoj@email.pl" style="width:100%;padding:9px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;outline:none">
            </div>
            <div style="margin-bottom:14px">
              <label style="display:block;font-size:13px;font-weight:500;color:#555;margin-bottom:5px">Nazwa użytkownika</label>
              <input id="auth-reg-username" type="text" placeholder="Jan" style="width:100%;padding:9px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;outline:none">
            </div>
            <div style="margin-bottom:20px">
              <label style="display:block;font-size:13px;font-weight:500;color:#555;margin-bottom:5px">Hasło</label>
              <input id="auth-reg-pass" type="password" placeholder="min. 6 znaków" style="width:100%;padding:9px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;outline:none">
            </div>
            <div id="auth-reg-error" style="color:#c62828;font-size:13px;margin-bottom:12px;display:none"></div>
            <button id="auth-reg-submit" style="width:100%;padding:11px;background:#f7b321;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">Zarejestruj się</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const switchTab = (tab) => {
      const isLogin = tab === 'login';
      document.getElementById('auth-login-form').style.display = isLogin ? '' : 'none';
      document.getElementById('auth-register-form').style.display = isLogin ? 'none' : '';
      document.getElementById('auth-modal-title').textContent = isLogin ? 'Zaloguj się' : 'Zarejestruj się';
      const tLogin = document.getElementById('auth-tab-login');
      const tReg   = document.getElementById('auth-tab-register');
      tLogin.style.color  = isLogin ? '#f7b321' : '#888';
      tLogin.style.borderBottomColor = isLogin ? '#f7b321' : 'transparent';
      tReg.style.color    = isLogin ? '#888' : '#f7b321';
      tReg.style.borderBottomColor   = isLogin ? 'transparent' : '#f7b321';
    };

    document.getElementById('auth-tab-login').addEventListener('click', () => switchTab('login'));
    document.getElementById('auth-tab-register').addEventListener('click', () => switchTab('register'));

    document.getElementById('auth-modal-close').addEventListener('click', () => {
      overlay.style.display = 'none';
    });
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.style.display = 'none';
    });

    document.getElementById('auth-login-submit').addEventListener('click', async () => {
      const email = document.getElementById('auth-login-email').value.trim();
      const pass  = document.getElementById('auth-login-pass').value;
      const errEl = document.getElementById('auth-login-error');
      errEl.style.display = 'none';
      const result = await loginUser(email, pass);
      if (result.loggedIn) {
        overlay.style.display = 'none';
        updateHeaderAuth(result);
      } else {
        errEl.textContent = result.error || 'Błąd logowania';
        errEl.style.display = '';
      }
    });

    document.getElementById('auth-reg-submit').addEventListener('click', async () => {
      const email    = document.getElementById('auth-reg-email').value.trim();
      const username = document.getElementById('auth-reg-username').value.trim();
      const pass     = document.getElementById('auth-reg-pass').value;
      const errEl    = document.getElementById('auth-reg-error');
      errEl.style.display = 'none';
      const result = await registerUser(email, username, pass);
      if (result.loggedIn) {
        overlay.style.display = 'none';
        updateHeaderAuth(result);
      } else {
        errEl.textContent = result.error || 'Błąd rejestracji';
        errEl.style.display = '';
      }
    });

    // Enter key support
    ['auth-login-email','auth-login-pass'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('auth-login-submit').click();
      });
    });
    ['auth-reg-email','auth-reg-username','auth-reg-pass'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('auth-reg-submit').click();
      });
    });
  }

  function openAuthModal(tab) {
    ensureAuthModal();
    const overlay = document.getElementById('auth-modal-overlay');
    overlay.style.display = 'flex';
    const switchTab = (t) => {
      const isLogin = t === 'login';
      document.getElementById('auth-login-form').style.display = isLogin ? '' : 'none';
      document.getElementById('auth-register-form').style.display = isLogin ? 'none' : '';
      document.getElementById('auth-modal-title').textContent = isLogin ? 'Zaloguj się' : 'Zarejestruj się';
      const tLogin = document.getElementById('auth-tab-login');
      const tReg   = document.getElementById('auth-tab-register');
      tLogin.style.color  = isLogin ? '#f7b321' : '#888';
      tLogin.style.borderBottomColor = isLogin ? '#f7b321' : 'transparent';
      tReg.style.color    = isLogin ? '#888' : '#f7b321';
      tReg.style.borderBottomColor   = isLogin ? 'transparent' : '#f7b321';
    };
    switchTab(tab || 'login');
  }

  // ── INIT ──────────────────────────────────────────────────
  async function init() {
    const page = document.body.dataset.page;
    if (page === 'category') initCategoryPage();
    else if (page === 'product') initProductPage();
    else if (page === 'profile') initProfilePage();
    else if (page === 'index' || page === 'home' || !page) initIndexPage();

    // Auth — wire up Zaloguj link and check session
    const nav = document.querySelector('.header-actions');
    if (nav) {
      const loginLink = Array.from(nav.querySelectorAll('a')).find(a => a.textContent.trim() === 'Zaloguj');
      if (loginLink) {
        loginLink.addEventListener('click', e => { e.preventDefault(); openAuthModal('login'); });
      }
      const user = await checkUserSession();
      if (user.loggedIn) updateHeaderAuth(user);
    }
  }

  // ── REVBOX SCORE TOOLTIP ──────────────────────────────────
  const SCORE_TOOLTIP_TEXT = 'Czym jest Revbox Score? To stosunek pozytywnych wzmianek na temat produktu w stosunku do wszystkich wzmianek. Pokazuje czy użytkownicy częściej chwalą dany produkt czy na niego narzekają.';

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-score-help]');
    // Close any open tooltip
    document.querySelectorAll('.score-tooltip').forEach(t => t.remove());
    if (!btn) return;
    e.stopPropagation();
    const tip = document.createElement('div');
    tip.className = 'score-tooltip';
    tip.textContent = SCORE_TOOLTIP_TEXT;
    btn.appendChild(tip);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
