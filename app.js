const API = "https://fakestoreapi.com";

// 1. Element Selectors - Centralized for cleaner code
const els = {
  categories: document.getElementById("categories"),
  productGrid: document.getElementById("productGrid"),
  trendingGrid: document.getElementById("trendingGrid"),
  detailsModal: document.getElementById("detailsModal"),
  detailsBody: document.getElementById("detailsBody"),
  cartModal: document.getElementById("cartModal"),
  cartBody: document.getElementById("cartBody"),
  cartTotal: document.getElementById("cartTotal"),
  cartCount: document.getElementById("cartCount"),
  year: document.getElementById("year")
};

// 2. State Management
const state = {
  categories: [],
  selectedCategory: "all",
  cache: new Map(), // Stores products by category
  allProducts: [],
  currentProducts: [],
  cart: [],
};

// 3. Helper Functions
const truncate = (text, n = 46) => text.length > n ? text.slice(0, n) + "..." : text;
const money = (n) => `$${Number(n).toFixed(2)}`;
const starString = (rate) => "★".repeat(Math.round(rate)) + "☆".repeat(5 - Math.round(rate));

// 4. Modal Logic
const openModal = (modalEl) => {
  modalEl.classList.add("open");
  modalEl.setAttribute("aria-hidden", "false");
};

const closeModal = (modalEl) => {
  modalEl.classList.remove("open");
  modalEl.setAttribute("aria-hidden", "true");
};

// 5. Cart Logic
function updateCartUI() {
  const total = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const count = state.cart.reduce((sum, item) => sum + item.qty, 0);

  if (els.cartCount) els.cartCount.textContent = count;
  if (els.cartTotal) els.cartTotal.textContent = money(total);

  if (state.cart.length === 0) {
    els.cartBody.innerHTML = `<p style="text-align:center; color:var(--muted); padding:20px;">Your cart is empty.</p>`;
    return;
  }

  els.cartBody.innerHTML = state.cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.title}">
      <div>
        <h4>${truncate(item.title, 30)}</h4>
        <div class="muted">${money(item.price)}</div>
      </div>
      <div class="qty">
        <button class="icon-btn" data-qty-minus="${item.id}">-</button>
        <span>${item.qty}</span>
        <button class="icon-btn" data-qty-plus="${item.id}">+</button>
      </div>
    </div>
  `).join("");
}

function addToCart(id) {
  const product = state.allProducts.find(p => p.id === Number(id));
  if (!product) return;

  const existing = state.cart.find(item => item.id === product.id);
  if (existing) {
    existing.qty++;
  } else {
    state.cart.push({ ...product, qty: 1 });
  }
  updateCartUI();
}

function changeQty(id, delta) {
  const item = state.cart.find(i => i.id === Number(id));
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    state.cart = state.cart.filter(i => i.id !== Number(id));
  }
  updateCartUI();
}

// 6. Rendering Functions
function cardHTML(p) {
  const rate = p?.rating?.rate ?? 0;
  return `
    <article class="card">
      <div class="card-img"><img src="${p.image}" alt="${p.title}"></div>
      <div class="card-body">
        <h3 class="card-title" title="${p.title}">${truncate(p.title)}</h3>
        <div class="meta">
          <span class="price">${money(p.price)}</span>
          <span class="badge">${p.category}</span>
        </div>
        <div class="rating">
          <span class="stars">${starString(rate)}</span>
          <small>(${rate})</small>
        </div>
        <div class="actions">
          <button class="btn" data-details="${p.id}">Details</button>
          <button class="btn" data-add="${p.id}">+ Cart</button>
        </div>
      </div>
    </article>`;
}

function renderCategories() {
  if (!els.categories) return;
  const all = ["all", ...state.categories];
  els.categories.innerHTML = all
    .map((c) => {
      const active = c === state.selectedCategory ? "active" : "";
      return `<button class="cat-btn ${active}" data-cat="${c}">${c}</button>`;
    })
    .join("");
}

// 7. Data Fetching
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

async function setCategory(category) {
  state.selectedCategory = category;
  renderCategories();
  try {
    let list;
    if (state.cache.has(category)) {
      list = state.cache.get(category);
    } else {
      const url = category === "all" ? `${API}/products` : `${API}/products/category/${encodeURIComponent(category)}`;
      list = await fetchJSON(url);
      state.cache.set(category, list);
    }
    state.currentProducts = list;
    els.productGrid.innerHTML = list.map(cardHTML).join("");
  } catch {
    els.productGrid.innerHTML = "<p>Failed to load products.</p>";
  }
}

async function openDetails(id) {
  openModal(els.detailsModal);
  els.detailsBody.innerHTML = "<p>Loading details...</p>";
  try {
    const p = await fetchJSON(`${API}/products/${id}`);
    const rate = p?.rating?.rate ?? 0;
    els.detailsBody.innerHTML = `
      <div class="details-img"><img src="${p.image}" alt="${p.title}"></div>
      <div class="details-info">
        <h2>${p.title}</h2>
        <div class="details-row"><span class="badge">${p.category}</span><span>⭐ ${rate}</span></div>
        <p>${p.description}</p>
        <div class="details-row"><strong>${money(p.price)}</strong></div>
        <div class="details-actions">
          <button class="btn" data-add="${p.id}">Add to Cart</button>
        </div>
      </div>`;
  } catch {
    els.detailsBody.innerHTML = "<p>Error loading details.</p>";
  }
}

// 8. Global Event Listeners (Event Delegation)
document.addEventListener("click", (e) => {
  const target = e.target;

  if (target.closest("[data-cat]")) setCategory(target.closest("[data-cat]").dataset.cat);
  if (target.closest("[data-details]")) openDetails(target.closest("[data-details]").dataset.details);
  if (target.closest("[data-add]")) addToCart(target.closest("[data-add]").dataset.add);
  
  // Modal Toggles
  if (target.closest("#cartBtn")) openModal(els.cartModal);
  if (target.closest("[data-close='cart']")) closeModal(els.cartModal);
  if (target.closest("[data-close='details']")) closeModal(els.detailsModal);

  // Qty adjust
  if (target.closest("[data-qty-plus]")) changeQty(target.closest("[data-qty-plus]").dataset.qtyPlus, 1);
  if (target.closest("[data-qty-minus]")) changeQty(target.closest("[data-qty-minus]").dataset.qtyMinus, -1);
});

// 9. Init
async function init() {
  if (els.year) els.year.textContent = new Date().getFullYear();
  try {
    const products = await fetchJSON(`${API}/products`);
    state.allProducts = products;
    state.currentProducts = products;
    state.cache.set("all", products);
    
    els.productGrid.innerHTML = products.map(cardHTML).join("");
    if (els.trendingGrid) els.trendingGrid.innerHTML = products.slice(0, 3).map(cardHTML).join("");
    
    state.categories = await fetchJSON(`${API}/products/categories`);
    renderCategories();
    updateCartUI();
  } catch (err) {
    console.error(err);
  }
}

init();