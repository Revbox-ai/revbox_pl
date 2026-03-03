const featureCatalog = [
  'Cena', 'System operacyjny', 'Jakość aparatu', 'Wydajność', 'Wielkość i jakość wyświetlacza',
  'Pojemność baterii', 'Ilość pamięci RAM i pamięci wewnętrznej', 'Funkcje dodatkowe',
  'Bezprzewodowe ładowanie', 'Zabezpieczenia', 'Design i jakość wykonania',
  'Obsługa 5G', 'Ekosystem aplikacji', 'Aktualizacje oprogramowania',
  'Komfort użytkowania', 'Obsługa dual SIM'
];

const helpFeatureCatalog = featureCatalog.filter(feature => ![
  'Ilość pamięci RAM i pamięci wewnętrznej',
  'Funkcje dodatkowe'
].includes(feature));

const products = [
  {
    id: 1,
    name: 'iPhone 16 Pro 128 GB Tytan',
    category: 'Smartfony',
    favorite: true,
    score: 75,
    revbox: 84,
    price: 12638,
    image: 'assets/images/products/smartfon_02.jpg',
    tags: ['Cena', 'Jakość aparatu', 'Design i jakość wykonania', 'Ekosystem aplikacji'],
    href: 'product.html'
  },
  {
    id: 2,
    name: 'Samsung A27 Pro',
    category: 'Smartfony',
    favorite: true,
    score: 83,
    revbox: 88,
    price: 2499,
    image: 'assets/images/products/smartfon_09.jpg',
    tags: ['Wydajność', 'Pojemność baterii', 'Obsługa 5G', 'Komfort użytkowania'],
    href: 'product.html'
  },
  {
    id: 3,
    name: 'POCO X5 Pro Yellow',
    category: 'Smartfony',
    favorite: true,
    score: 91,
    revbox: 84,
    price: 1263,
    image: 'assets/images/products/smartfon_01.jpg',
    tags: ['Cena', 'Wydajność', 'Wielkość i jakość wyświetlacza', 'Pojemność baterii'],
    href: 'product.html'
  },
  {
    id: 4,
    name: 'Redmi Note 12 X Pro',
    category: 'Smartfony',
    favorite: false,
    score: 79,
    revbox: 81,
    price: 1638,
    image: 'assets/images/products/smartfon_08.jpg',
    tags: ['Cena', 'Wydajność', 'Ilość pamięci RAM i pamięci wewnętrznej'],
    href: 'product.html'
  },
  {
    id: 5,
    name: 'Google Pixel Air',
    category: 'Smartfony',
    favorite: false,
    score: 72,
    revbox: 86,
    price: 3399,
    image: 'assets/images/products/smartfon_18.jpg',
    tags: ['Jakość aparatu', 'Aktualizacje oprogramowania', 'Ekosystem aplikacji'],
    href: 'product.html'
  },
  {
    id: 9,
    name: 'Xiaomi Nova Blue',
    category: 'Smartfony',
    favorite: false,
    score: 77,
    revbox: 83,
    price: 2189,
    image: 'assets/images/products/smartfon_03.jpg',
    tags: ['Cena', 'Pojemność baterii', 'Komfort użytkowania'],
    href: 'product.html'
  },
  {
    id: 10,
    name: 'Mint Phone Lite',
    category: 'Smartfony',
    favorite: false,
    score: 69,
    revbox: 80,
    price: 1799,
    image: 'assets/images/products/smartfon_04.jpg',
    tags: ['Cena', 'Design i jakość wykonania'],
    href: 'product.html'
  },
  {
    id: 11,
    name: 'Silver Vision Max',
    category: 'Smartfony',
    favorite: false,
    score: 82,
    revbox: 85,
    price: 2899,
    image: 'assets/images/products/smartfon_05.jpg',
    tags: ['Jakość aparatu', 'Wielkość i jakość wyświetlacza', 'Obsługa 5G'],
    href: 'product.html'
  },
  {
    id: 12,
    name: 'Graphite Ultra S',
    category: 'Smartfony',
    favorite: false,
    score: 74,
    revbox: 82,
    price: 2599,
    image: 'assets/images/products/smartfon_06.jpg',
    tags: ['Wydajność', 'Design i jakość wykonania'],
    href: 'product.html'
  },
  {
    id: 13,
    name: 'Pink Air Mini',
    category: 'Smartfony',
    favorite: false,
    score: 66,
    revbox: 79,
    price: 1499,
    image: 'assets/images/products/smartfon_07.jpg',
    tags: ['Cena', 'Komfort użytkowania'],
    href: 'product.html'
  },
  {
    id: 14,
    name: 'Snow One',
    category: 'Smartfony',
    favorite: false,
    score: 71,
    revbox: 78,
    price: 1399,
    image: 'assets/images/products/smartfon_10.jpg',
    tags: ['Cena', 'Obsługa dual SIM'],
    href: 'product.html'
  },
  {
    id: 15,
    name: 'Blue Titan Pro',
    category: 'Smartfony',
    favorite: false,
    score: 84,
    revbox: 87,
    price: 3199,
    image: 'assets/images/products/smartfon_11.jpg',
    tags: ['Wydajność', 'Jakość aparatu', 'Pojemność baterii'],
    href: 'product.html'
  },
  {
    id: 16,
    name: 'Sunrise X',
    category: 'Smartfony',
    favorite: false,
    score: 73,
    revbox: 81,
    price: 1899,
    image: 'assets/images/products/smartfon_12.jpg',
    tags: ['Wielkość i jakość wyświetlacza', 'Pojemność baterii'],
    href: 'product.html'
  },
  {
    id: 17,
    name: 'Aurora Violet',
    category: 'Smartfony',
    favorite: false,
    score: 76,
    revbox: 82,
    price: 2099,
    image: 'assets/images/products/smartfon_13.jpg',
    tags: ['Design i jakość wykonania', 'Obsługa 5G'],
    href: 'product.html'
  },
  {
    id: 18,
    name: 'Wave Plus',
    category: 'Smartfony',
    favorite: false,
    score: 78,
    revbox: 83,
    price: 2299,
    image: 'assets/images/products/smartfon_14.jpg',
    tags: ['Wydajność', 'Wielkość i jakość wyświetlacza'],
    href: 'product.html'
  },
  {
    id: 19,
    name: 'Black Core',
    category: 'Smartfony',
    favorite: false,
    score: 75,
    revbox: 81,
    price: 1999,
    image: 'assets/images/products/smartfon_15.jpg',
    tags: ['Komfort użytkowania', 'Pojemność baterii'],
    href: 'product.html'
  },
  {
    id: 20,
    name: 'Frost Duo',
    category: 'Smartfony',
    favorite: false,
    score: 79,
    revbox: 84,
    price: 2399,
    image: 'assets/images/products/smartfon_16.jpg',
    tags: ['Jakość aparatu', 'Obsługa dual SIM'],
    href: 'product.html'
  },
  {
    id: 21,
    name: 'Sky Blue Max',
    category: 'Smartfony',
    favorite: false,
    score: 81,
    revbox: 85,
    price: 2799,
    image: 'assets/images/products/smartfon_17.jpg',
    tags: ['Ekosystem aplikacji', 'Jakość aparatu'],
    href: 'product.html'
  },
  {
    id: 6,
    name: 'Dreame L40 Ultra',
    category: 'AGD',
    favorite: true,
    score: 78,
    revbox: 84,
    price: 4199,
    image: 'assets/images/products/05_odkurzacz.jpg',
    tags: ['Funkcje dodatkowe', 'Komfort użytkowania', 'Wydajność'],
    href: 'product.html'
  },
  {
    id: 7,
    name: 'Philips A3726GHX',
    category: 'AGD',
    favorite: true,
    score: 74,
    revbox: 82,
    price: 899,
    image: 'assets/images/products/04_czajnik.jpg',
    tags: ['Cena', 'Komfort użytkowania'],
    href: 'product.html'
  },
  {
    id: 8,
    name: 'Ekspres do kawy Chibo',
    category: 'AGD',
    favorite: true,
    score: 80,
    revbox: 84,
    price: 1499,
    image: 'assets/images/products/06_ekspres_do_kawy.jpg',
    tags: ['Funkcje dodatkowe', 'Komfort użytkowania', 'Design i jakość wykonania'],
    href: 'product.html'
  }
];

const offers = [
  { brand: 'allegro', desc: 'Obudowa do komputera x-kom H&O 200 6818', price: '69,00 zł', details: 'szczegóły dostawy', delivery: 'Wysyłka w 1 dzień', cta: 'Idź do sklepu' },
  { brand: 'x-kom', desc: 'x-kom H&O 200 6818 - szybka bezpieczna dostawa lub możliwość darmowego odbioru w 22 miastach', price: '99,00 zł', details: 'Z wysyłką od 109,99 zł', delivery: 'Wysyłka w 1 dzień', cta: 'Idź do sklepu' }
];

let selectedFeatures = new Set(['Cena', 'Jakość aparatu', 'Wydajność', 'Pojemność baterii']);
let featuresExpanded = false;
let helpSelectedFeatures = new Set(selectedFeatures);
const categoryProfiles = {
  'Smartfony': selectedFeatures,
  'AGD': new Set()
};

function getFeatureSetForCategory(category, fallback = selectedFeatures) {
  return categoryProfiles[category] || fallback;
}

function hasProfileForCategory(category, featureSet = null) {
  const active = featureSet || getFeatureSetForCategory(category);
  return Boolean(active && active.size);
}

function computeMatch(product, featureSet = null) {
  const activeFeatures = featureSet || getFeatureSetForCategory(product.category);
  if (!activeFeatures || !activeFeatures.size) return null;
  let hits = 0;
  activeFeatures.forEach(feature => {
    if (product.tags.includes(feature)) hits += 1;
  });
  const ratio = hits / activeFeatures.size;
  const score = Math.round(55 + ratio * 40);
  return Math.max(55, Math.min(score, 99));
}

function productCard(product, options = {}) {
  const { featureSet = null, extraClass = '' } = options;
  const match = computeMatch(product, featureSet);
  const hasProfile = match !== null;
  const classes = ['product-card', extraClass, !hasProfile ? 'product-card-no-score' : ''].filter(Boolean).join(' ');
  const ringStyle = hasProfile ? ` style="--score:${match}"` : '';
  const ringMarkup = hasProfile
    ? `<div class="match-ring"${ringStyle}><span>${match}<small>%</small></span></div>`
    : `<button class="match-ring match-ring-empty match-ring-trigger" data-modal="noProfileInfo" aria-label="Dlaczego nie widzę match score?"><span>?</span></button>`;
  return `
    <article class="${classes}">
      <div class="product-card-head">
        <div class="match-label"><button class="match-help-trigger" data-modal="matchInfo" aria-label="Informacje o match score">?</button><span>Your match score</span></div>
        ${ringMarkup}
      </div>
      <img class="product-image" src="${product.image}" alt="${product.name}">
      <h3>${product.name}</h3>
      <div class="meta-wrap"><button class="score-help-btn" data-score-help="1" aria-label="Co to jest Revbox Score?">?</button><div class="meta"><span>Revbox score</span><strong>${product.revbox}%</strong></div></div>
      <div class="price-line">Przeanalizowano <strong>${product.price}</strong> wzmianek</div>
      <div class="card-actions"><a class="btn btn-outline" href="${product.href}">Zobacz recenzję</a></div>
    </article>
  `;
}

function miniProductCard(product, featureSet = helpSelectedFeatures) {
  return productCard(product, { featureSet, extraClass: 'product-card-compact help-mini-card' });
}

function offerRow(offer) {
  return `
    <article class="offer-row">
      <div class="offer-brand">${offer.brand}</div>
      <div class="offer-content">${offer.desc}</div>
      <div class="offer-price"><strong>${offer.price}</strong><div class="muted small">${offer.details}</div><div class="offer-delivery small">${offer.delivery}</div><a class="btn" href="#">${offer.cta}</a></div>
    </article>
  `;
}

function renderFeatures() {
  document.querySelectorAll('[data-render="features"]').forEach(container => {
    container.innerHTML = featureCatalog.map((feature, index) => `
      <label class="feature-item ${!featuresExpanded && index >= 8 ? 'hidden-feature' : ''}">
        <input type="checkbox" value="${feature}" ${selectedFeatures.has(feature) ? 'checked' : ''}>
        <span>${feature}</span>
      </label>
    `).join('');
  });

  document.querySelectorAll('.feature-item input').forEach(input => {
    input.addEventListener('change', e => {
      const value = e.target.value;
      if (e.target.checked) selectedFeatures.add(value);
      else selectedFeatures.delete(value);
      rerenderByScore();
    });
  });

  document.querySelectorAll('[data-load-features]').forEach(button => {
    button.textContent = featuresExpanded ? 'Pokaż mniej' : 'Load more';
  });
}

function rerenderByScore() {
  const sorted = [...products].sort((a, b) => {
    const scoreA = computeMatch(a) ?? -1;
    const scoreB = computeMatch(b) ?? -1;
    return scoreB - scoreA;
  });

  document.querySelectorAll('[data-render="category-products"]').forEach(node => {
    node.innerHTML = sorted.filter(p => p.category === 'Smartfony').slice(0, 12).map(product => productCard(product, { featureSet: selectedFeatures })).join('');
  });

  document.querySelectorAll('[data-render="featured-phones"]').forEach(node => {
    node.innerHTML = sorted.filter(p => p.category === 'Smartfony').slice(0, 5).map(product => productCard(product, { featureSet: selectedFeatures })).join('');
  });

  document.querySelectorAll('[data-render="featured-appliances"]').forEach(node => {
    const featuredAgd = products.filter(p => p.category === 'AGD').slice(0, 3);
    node.innerHTML = featuredAgd.concat(featuredAgd[0], featuredAgd[1]).slice(0, 5).map(product => productCard(product, { featureSet: categoryProfiles['AGD'] })).join('');
  });

  document.querySelectorAll('[data-render="recommended"]').forEach(node => {
    node.innerHTML = sorted.filter(p => p.category === 'Smartfony').slice(0, 5).map(product => productCard(product, { featureSet: selectedFeatures })).join('');
  });

  const scoreDisplay = document.querySelector('[data-score-value]');
  if (scoreDisplay) {
    const mainProduct = products.find(p => p.name === 'Samsung A27 Pro') || products[1];
    const score = computeMatch(mainProduct, selectedFeatures) ?? 0;
    scoreDisplay.textContent = score;
    const scoreCircle = document.querySelector('.score-circle');
    if (scoreCircle) scoreCircle.style.setProperty('--score', score);
  }
}


function getSortedProducts(featureSet = selectedFeatures) {
  return [...products].sort((a, b) => {
    const scoreA = computeMatch(a, featureSet) ?? -1;
    const scoreB = computeMatch(b, featureSet) ?? -1;
    return scoreB - scoreA;
  });
}


function renderHelpFeatures() {
  const container = document.querySelector('[data-render="help-features"]');
  if (!container) return;

  container.innerHTML = helpFeatureCatalog.slice(0, 8).map(feature => `
    <label class="feature-item">
      <input type="checkbox" value="${feature}" ${helpSelectedFeatures.has(feature) ? 'checked' : ''}>
      <span>${feature}</span>
    </label>
  `).join('');

  container.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', e => {
      const value = e.target.value;
      if (e.target.checked) helpSelectedFeatures.add(value);
      else helpSelectedFeatures.delete(value);
      helpRotationIndex = 0;
      renderHelpProducts();
    });
  });
}

function renderHelpProducts() {
  const container = document.querySelector('[data-render="help-mini-products"]');
  if (!container) return;

  const sorted = getSortedProducts(helpSelectedFeatures).filter(product => product.category === 'Smartfony');
  if (!sorted.length) {
    container.innerHTML = '';
    return;
  }

  const cards = [];
  const visible = Math.min(3, sorted.length);
  for (let i = 0; i < visible; i += 1) {
    cards.push(sorted[(helpRotationIndex + i) % sorted.length]);
  }

  container.innerHTML = cards.map(product => miniProductCard(product, helpSelectedFeatures)).join('');
}


function initHelpModal() {
  helpSelectedFeatures = new Set(selectedFeatures);
  helpRotationIndex = 0;
  renderHelpFeatures();
  renderHelpProducts();
}



function renderHowItWorksPage() {
  document.querySelectorAll('[data-render="howitw-features"]').forEach(container => {
    container.innerHTML = helpFeatureCatalog.slice(0, 6).map(feature => `
      <label class="feature-item">
        <input type="checkbox" ${selectedFeatures.has(feature) ? 'checked' : ''} disabled>
        <span>${feature}</span>
      </label>
    `).join('');
  });

  document.querySelectorAll('[data-render="howitw-products"]').forEach(container => {
    container.innerHTML = getSortedProducts(selectedFeatures).filter(product => product.category === 'Smartfony').slice(0, 4).map(product => productCard(product, { featureSet: selectedFeatures })).join('');
  });
}

function ensureMatchInfoModal() {
  if (document.getElementById('matchInfo')) return;

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'matchInfo';
  modal.innerHTML = `
    <div class="modal-card match-info-modal">
      <button class="modal-close" data-close="matchInfo">×</button>
      <h3>Czym jest procent dopasowania (MATCH SCORE)?</h3>
      <p>Procent dopasowania to wskaźnik, który pokazuje, jak dobrze dany produkt odpowiada Twoim preferencjom i potrzebom. Na podstawie Twoich wyborów i priorytetów, algorytm Match Score oblicza, w jakim stopniu dany produkt spełnia Twoje oczekiwania, wyrażając to w formie procentowej.</p>
      <a href="how-it-works.html" class="btn btn-outline">O algorytmie MATCH SCORE</a>
    </div>
  `;

  document.body.appendChild(modal);
}

function ensureNoProfileModal() {
  if (document.getElementById('noProfileInfo')) return;

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'noProfileInfo';
  modal.innerHTML = `
    <div class="modal-card match-info-modal no-profile-modal">
      <button class="modal-close" data-close="noProfileInfo">×</button>
      <h3>Dlaczego nie widzę procentu dopasowania produktów?</h3>
      <p>Nie widzisz procentu dopasowania, ponieważ nie określiłeś jeszcze swoich preferencji. Aby Match Score mógł dokładnie dopasować produkty do Twoich potrzeb, wypełnij profil cechami, które są dla Ciebie najważniejsze.</p>
      <a href="category.html" class="btn btn-outline">Stwórz swój profil preferencji</a>
    </div>
  `;

  document.body.appendChild(modal);
}

function ensureQuotesModal() {
  if (document.getElementById('quotesModal')) return;

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'quotesModal';
  modal.innerHTML = `
    <div class="modal-card quotes-modal">
      <button class="modal-close" data-close="quotesModal">×</button>
      <h3>Cytaty dla danej cechy</h3>
      <div class="quote-list" data-quote-list></div>
    </div>
  `;

  document.body.appendChild(modal);
}

function openQuotesModal(feature, sentiment = 'positive') {
  ensureQuotesModal();
  const list = document.querySelector('[data-quote-list]');
  const title = document.querySelector('#quotesModal h3');
  if (!list || !title) return;

  title.textContent = `Cytaty dla cechy: ${feature}`;
  const quoteMap = {
    'Wydajność': [
      ['Telefon działa błyskawicznie nawet przy wielu otwartych aplikacjach.', 41],
      ['Zaskakująco płynny także podczas grania w wymagające gry.', 26],
      ['Procesor radzi sobie świetnie, bez lagów i spowolnień.', 13],
      ['Do codziennych zadań jest szybki, choć przy bardziej zaawansowanych trochę zwalnia.', 9],
      ['Przełączanie między aplikacjami jest bardzo płynne.', 7]
    ],
    'Szybkość': [
      ['System uruchamia się bardzo szybko i reaguje od razu.', 19],
      ['Aplikacje otwierają się niemal natychmiast.', 12],
      ['Bywa szybki, ale po czasie potrafi lekko przyciąć.', 6]
    ],
    'Jakość': [
      ['Wykonanie stoi na wysokim poziomie jak na tę cenę.', 18],
      ['Obudowa sprawia wrażenie solidnej i dobrze spasowanej.', 11],
      ['Niektóre elementy mogłyby być wykończone staranniej.', 4]
    ],
    'Funkcjonalność': [
      ['Ma wszystkie potrzebne funkcje do codziennego użycia.', 15],
      ['Rozwiązania są praktyczne i wygodne w obsłudze.', 8],
      ['Brakuje kilku opcji znanych z droższych modeli.', 3]
    ],
    'Instalacja': [
      ['Konfiguracja była szybka i bezproblemowa.', 14],
      ['Pierwsze uruchomienie zajęło tylko chwilę.', 9],
      ['Instrukcja mogłaby być bardziej czytelna.', 2]
    ],
    'Pojemność': [
      ['Pojemność jest wystarczająca na codzienne potrzeby.', 10],
      ['Na plus sporo miejsca na dane i aplikacje.', 7],
      ['Przy intensywnym użytkowaniu pamięci zaczyna brakować.', 3]
    ],
    'Kompatybilność': [
      ['Bez problemu współpracuje z innymi urządzeniami.', 9],
      ['Połączenie z akcesoriami przebiegło sprawnie.', 5],
      ['Zdarzają się problemy z wybranymi akcesoriami.', 2]
    ],
    'Wartość': [
      ['Za tę cenę oferuje naprawdę dużo.', 12],
      ['Dobry kompromis między funkcjami a kosztem.', 7],
      ['Mógłby kosztować trochę mniej.', 2]
    ],
    'Stosunek ceny do jakości': [
      ['Świetny stosunek ceny do jakości.', 16],
      ['W swojej klasie cenowej wypada bardzo korzystnie.', 11],
      ['W promocji jest zdecydowanie bardziej opłacalny.', 4]
    ],
    'Niezawodność': [
      ['Działa stabilnie i nie sprawia problemów.', 13],
      ['Do tej pory działa bezawaryjnie.', 8],
      ['Sporadycznie zdarzają się drobne błędy.', 3]
    ],
    'Trwałość': [
      ['Po dłuższym czasie dalej wygląda i działa dobrze.', 8],
      ['Materiały sprawiają wrażenie trwałych.', 5],
      ['Obawiam się o trwałość przy intensywnym użytkowaniu.', 2]
    ]
  };

  const sourceRows = [...(quoteMap[feature] || quoteMap['Wydajność'])];
  while (sourceRows.length < 20) {
    const idx = sourceRows.length + 1;
    sourceRows.push([`Kolejna opinia użytkowników dotycząca cechy ${feature.toLowerCase()}.`, Math.max(0, 6 - idx)]);
  }

  const rows = sourceRows.map(([text, votes]) => `
    <div class="quote-row">
      <p>"${text}"</p>
      <span class="quote-votes">${votes}</span>
      <span class="quote-like">👍</span>
    </div>
  `).join('');

  list.innerHTML = rows;
  openModal('quotesModal');
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('active');
  if (id === 'featureHelp') initHelpModal();
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('active');

}

function renderOffers() {
  document.querySelectorAll('[data-render="offers"], [data-render="offers-modal"]').forEach(node => {
    node.innerHTML = offers.map(offerRow).join('');
  });
}

function renderFavorites() {
  const page = document.body.dataset.page;
  if (page !== 'favorites') return;

  const grid = document.querySelector('[data-render="favorite-products"]');
  const chips = document.querySelectorAll('[data-filter-category]');
  if (!grid || !chips.length) return;

  function applyFilter(category) {
    chips.forEach(chip => chip.classList.toggle('active', chip.dataset.filterCategory === category));
    const favoriteProducts = products.filter(product => product.favorite);
    const filtered = category === 'Wszystkie'
      ? favoriteProducts
      : favoriteProducts.filter(product => product.category === category);

    grid.innerHTML = filtered.map(productCard).join('');
    const count = document.querySelector('[data-favorites-count]');
    if (count) count.textContent = `${filtered.length} produktów`;
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => applyFilter(chip.dataset.filterCategory));
  });

  applyFilter('Wszystkie');
}


function bindFeatureExpand() {
  document.querySelectorAll('[data-load-features]').forEach(button => {
    button.addEventListener('click', () => {
      featuresExpanded = !featuresExpanded;
      renderFeatures();
    });
  });
}

function bindModals() {
  document.addEventListener('click', e => {
    const quoteTrigger = e.target.closest('[data-quote-feature]');
    if (quoteTrigger) {
      e.preventDefault();
      openQuotesModal(quoteTrigger.dataset.quoteFeature, quoteTrigger.dataset.quoteSentiment || 'positive');
      return;
    }

    const modalTrigger = e.target.closest('[data-modal]');
    if (modalTrigger) {
      e.preventDefault();
      openModal(modalTrigger.dataset.modal);
      return;
    }

    const closeTrigger = e.target.closest('[data-close]');
    if (closeTrigger) {
      closeModal(closeTrigger.dataset.close);
      return;
    }

    const backdrop = e.target.classList && e.target.classList.contains('modal-backdrop') ? e.target : null;
    if (backdrop) {
      closeModal(backdrop.id);
    }
  });
}



function initFeatureInsightToggles() {
  document.querySelectorAll('.insight-group').forEach(group => {
    const items = Array.from(group.querySelectorAll('.insight-item'));
    const actions = group.querySelector('.insight-actions');
    const moreButton = actions ? actions.querySelector('.btn') : null;
    if (!actions || !moreButton) return;

    const initialVisible = 8;
    const stepVisible = 8;

    if (items.length <= initialVisible) {
      moreButton.style.display = 'none';
      return;
    }

    let visibleCount = initialVisible;
    let collapseButton = actions.querySelector('.btn-collapse');
    if (!collapseButton) {
      collapseButton = document.createElement('button');
      collapseButton.type = 'button';
      collapseButton.className = 'btn btn-light btn-collapse';
      collapseButton.textContent = 'Zwiń cechy';
      collapseButton.style.display = 'none';
      actions.appendChild(collapseButton);
    }

    const update = () => {
      items.forEach((item, index) => {
        item.style.display = index < visibleCount ? '' : 'none';
      });

      const isExpanded = visibleCount > initialVisible;
      const hasMore = visibleCount < items.length;

      moreButton.style.display = hasMore ? '' : 'none';
      moreButton.textContent = 'Pokaż więcej cech';
      collapseButton.style.display = isExpanded ? '' : 'none';
    };

    moreButton.addEventListener('click', () => {
      visibleCount = Math.min(items.length, visibleCount + stepVisible);
      update();
    });

    collapseButton.addEventListener('click', () => {
      visibleCount = initialVisible;
      update();
    });

    update();
  });
}

function init() {
  renderFeatures();
  rerenderByScore();
  renderOffers();
  renderFavorites();
  renderHowItWorksPage();
  bindFeatureExpand();
  ensureMatchInfoModal();
  ensureNoProfileModal();
  ensureQuotesModal();
  initFeatureInsightToggles();
  bindModals();
}

document.addEventListener('DOMContentLoaded', init);
