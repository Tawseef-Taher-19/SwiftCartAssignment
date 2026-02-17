const API = "https://fakestoreapi.com";

const els = {
  year: document.getElementById("year"),
  hamburger: document.getElementById("hamburger"),
  navLinks: document.getElementById("navLinks"),

  catWrap: document.getElementById("categories"),
  grid: document.getElementById("productGrid"),
  trendingGrid: document.getElementById("trendingGrid"),
  loading: document.getElementById("loading"),
  searchInput: document.getElementById("searchInput"),

  detailsModal: document.getElementById("detailsModal"),
  detailsBody: document.getElementById("detailsBody"),

  cartModal: document.getElementById("cartModal"),
  openCart: document.getElementById("openCart"),
  cartBody: document.getElementById("cartBody"),
  cartTotal: document.getElementById("cartTotal"),
  cartCount: document.getElementById("cartCount"),
  checkoutBtn: document.getElementById("checkoutBtn"),

  toast: document.getElementById("toast"),
  newsletterForm: document.getElementById("newsletterForm"),
};

const state = {
  categories: [],
  selectedCategory: "all",
  cache: new Map(),       // key: category -> products[]
  allProducts: [],
  filteredProducts: [],
  cart: loadCart(),       // [{id, qty}]
};

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem("swiftcart_cart") || "[]");
  } catch {
    return [];
  }
}
function saveCart() {
  localStorage.setItem("swiftcart_cart", JSON.stringify(state.cart));
}

function setLoading(isLoading) {
  els.loading.hidden = !isLoading;
}

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  setTimeout(() => els.toast.classList.remove("show"), 1400);
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

function money(n) {
  return `$${Number(n).toFixed(2)}`;
}

function truncate(text, n = 46) {
  if (!text) return "";
  return text.length > n ? text.slice(0, n) + "..." : text;
}

function starString(rate) {
  const r = Math.max(0, Math.min(5, Number(rate || 0)));
  const full = Math.round(r);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

/* ----------------- RENDER ----------------- */
function renderCategories() {
  const list = ["all", ...state.categories];
  els.catWrap.innerHTML = list
    .map((c) => {
      const active = c === state.selectedCategory ? "active" : "";
      return `<button class="cat-btn ${active}" data-cat="${c}">${c}</button>`;
    })
    .join("");
}

function cardHTML(p, compact = false) {
  const rate = p?.rating?.rate ?? 0;
  const count = p?.rating?.count ?? 0;

  return `
  <article class="card">
    <div class="card-img">
      <img src="${p.image}" alt="${p.title}">
    </div>

    <div class="card-body">
      <h3 class="card-title" title="${p.title}">${truncate(p.title, compact ? 40 : 48)}</h3>

      <div class="meta">
        <span class="price">${money(p.price)}</span>
        <span class="badge">${p.category}</span>
      </div>

      <div class="rating">
        <span class="stars">${starString(rate)}</span>
        <small>(${rate} • ${count})</small>
      </div>

      <div class="actions">
        <button class="btn" data-details="${p.id}">Details</button>
        <button class="btn primary" data-add="${p.id}">Add to Cart</button>
      </div>
    </div>
  </article>`;
}

function renderProducts(items) {
  els.grid.innerHTML = items.map((p) => cardHTML(p)).join("");
}

function renderTrending() {
  const top3 = [...state.allProducts]
    .sort((a, b) => (b.rating?.rate ?? 0) - (a.rating?.rate ?? 0))
    .slice(0, 3);

  els.trendingGrid.innerHTML = top3.map((p) => cardHTML(p, true)).join("");
}

function updateCartUI() {
  const totalItems = state.cart.reduce((sum, it) => sum + it.qty, 0);
  els.cartCount.textContent = totalItems;

  const itemsHTML = state.cart
    .map((it) => {
      const p = state.allProducts.find((x) => x.id === it.id);
      if (!p) return "";
      return `
      <div class="cart-item">
        <img src="${p.image}" alt="${p.title}">
        <div>
          <h4 title="${p.title}">${truncate(p.title, 44)}</h4>
          <div class="muted">${money(p.price)} • <span class="badge">${p.category}</span></div>
        </div>
        <div class="qty">
          <button class="icon-btn" data-dec="${p.id}" aria-label="Decrease">−</button>
          <strong>${it.qty}</strong>
          <button class="icon-btn" data-inc="${p.id}" aria-label="Increase">+</button>
          <button class="icon-btn" data-remove="${p.id}" aria-label="Remove">🗑️</button>
        </div>
      </div>`;
    })
    .join("");

  els.cartBody.innerHTML = itemsHTML || `<p class="muted">Your cart is empty.</p>`;

  const total = state.cart.reduce((sum, it) => {
    const p = state.allProducts.find((x) => x.id === it.id);
    return sum + (p ? p.price * it.qty : 0);
  }, 0);

  els.cartTotal.textContent = money(total);
}

/* ----------------- DATA LOAD ----------------- */
async function loadCategories() {
  state.categories = await fetchJSON(`${API}/products/categories`);
  renderCategories();
}

async function loadProductsByCategory(category) {
  if (state.cache.has(category)) return state.cache.get(category);

  const url =
    category === "all"
      ? `${API}/products`
      : `${API}/products/category/${encodeURIComponent(category)}`;

  const data = await fetchJSON(url);
  state.cache.set(category, data);
  return data;
}


async function setCategory(category) {
  state.selectedCategory = category;
  renderCategories();

  const isCached = state.cache.has(category);
  if (!isCached) setLoading(true);

  try {
    const products = await loadProductsByCategory(category);
    state.filteredProducts = products;
    applySearch();
  } catch {
    els.grid.innerHTML = `<p class="muted">Failed to load products.</p>`;
  } finally {
    if (!isCached) setLoading(false);
  }
}


function applySearch() {
  const q = (els.searchInput.value || "").trim().toLowerCase();
  const list = q
    ? state.filteredProducts.filter((p) => (p.title || "").toLowerCase().includes(q))
    : state.filteredProducts;

  renderProducts(list);
}

/* ----------------- MODALS ----------------- */
function openModal(modalEl) {
  modalEl.classList.add("open");
  modalEl.setAttribute("aria-hidden", "false");
}
function closeModal(modalEl) {
  modalEl.classList.remove("open");
  modalEl.setAttribute("aria-hidden", "true");
}

async function openDetails(id) {
  openModal(els.detailsModal);
  els.detailsBody.innerHTML =
    `<div class="loading"><div class="spinner"></div><span>Loading details...</span></div>`;

  try {
    const p = await fetchJSON(`${API}/products/${id}`);
    const rate = p?.rating?.rate ?? 0;

    els.detailsBody.innerHTML = `
      <div class="details-img">
        <img src="${p.image}" alt="${p.title}">
      </div>
      <div class="details-info">
        <h2>${p.title}</h2>
        <div class="details-row">
          <span class="badge">${p.category}</span>
          <span class="muted"><span class="stars">${starString(rate)}</span> (${rate})</span>
        </div>
        <p>${p.description}</p>
        <div class="details-row">
          <strong>${money(p.price)}</strong>
          <span class="muted">In stock (demo)</span>
        </div>
        <div class="details-actions">
          <button class="btn" data-close="details">Buy Now</button>
          <button class="btn primary" data-add="${p.id}">Add to Cart</button>
        </div>
      </div>
    `;
  } catch {
    els.detailsBody.innerHTML = `<p class="muted">Failed to load details.</p>`;
  }
}

/* ----------------- CART LOGIC ----------------- */
function addToCart(id) {
  id = Number(id);
  const item = state.cart.find((x) => x.id === id);
  if (item) item.qty += 1;
  else state.cart.push({ id, qty: 1 });

  saveCart();
  updateCartUI();
  toast("Added to cart");
}

function incQty(id) {
  const item = state.cart.find((x) => x.id === Number(id));
  if (!item) return;
  item.qty += 1;
  saveCart();
  updateCartUI();
}

function decQty(id) {
  const item = state.cart.find((x) => x.id === Number(id));
  if (!item) return;
  item.qty -= 1;
  if (item.qty <= 0) state.cart = state.cart.filter((x) => x.id !== Number(id));
  saveCart();
  updateCartUI();
}

function removeItem(id) {
  state.cart = state.cart.filter((x) => x.id !== Number(id));
  saveCart();
  updateCartUI();
}

/* ----------------- EVENTS ----------------- */
document.addEventListener("click", async (e) => {
  // Category
  const catBtn = e.target.closest(".cat-btn");
  if (catBtn) {
    await setCategory(catBtn.dataset.cat);
    return;
  }

  // Details open
  const detailsBtn = e.target.closest("[data-details]");
  if (detailsBtn) {
    await openDetails(detailsBtn.dataset.details);
    return;
  }

  // Add to cart (from card or modal)
  const addBtn = e.target.closest("[data-add]");
  if (addBtn) {
    addToCart(addBtn.dataset.add);
    return;
  }

  // Close modals
  const closeBtn = e.target.closest("[data-close]");
  if (closeBtn?.dataset.close === "details") closeModal(els.detailsModal);
  if (closeBtn?.dataset.close === "cart") closeModal(els.cartModal);

  // Backdrop close
  if (e.target.matches(".modal-backdrop")) {
    const which = e.target.getAttribute("data-close");
    if (which === "details") closeModal(els.detailsModal);
    if (which === "cart") closeModal(els.cartModal);
  }

  // Cart controls
  const inc = e.target.closest("[data-inc]");
  if (inc) incQty(inc.dataset.inc);

  const dec = e.target.closest("[data-dec]");
  if (dec) decQty(dec.dataset.dec);

  const rm = e.target.closest("[data-remove]");
  if (rm) removeItem(rm.dataset.remove);
});

els.openCart.addEventListener("click", () => {
  openModal(els.cartModal);
  updateCartUI();
});

els.searchInput.addEventListener("input", applySearch);

els.hamburger.addEventListener("click", () => {
  const open = els.navLinks.classList.toggle("open");
  els.hamburger.setAttribute("aria-expanded", String(open));
});

els.newsletterForm.addEventListener("submit", (e) => {
  e.preventDefault();
  toast("Subscribed!");
  e.target.reset();
});

els.checkoutBtn.addEventListener("click", () => {
  toast("Checkout (demo)");
});

/* ----------------- INIT ----------------- */
(async function init() {
  els.year.textContent = String(new Date().getFullYear());

  // Load all products first (for trending + cart price lookup)
  setLoading(true);
  try {
    const all = await fetchJSON(`${API}/products`);
    state.allProducts = all;
    state.cache.set("all", all);

    // default
    state.filteredProducts = all;
    renderTrending();
    renderProducts(all);
  } catch {
    els.grid.innerHTML = `<p class="muted">Failed to load products.</p>`;
  } finally {
    setLoading(false);
  }

  // Categories
  try {
    await loadCategories();
  } catch {
    els.catWrap.innerHTML = `<p class="muted">Failed to load categories.</p>`;
  }

  updateCartUI();
})();
