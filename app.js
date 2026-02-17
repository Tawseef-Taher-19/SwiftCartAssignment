const API = "https://fakestoreapi.com";

// Update year and handle newsletter
document.getElementById("year").textContent = String(new Date().getFullYear());
document.getElementById("newsletterForm").addEventListener("submit", (e) => {
  e.preventDefault();
  alert("Subscribed (demo)!");
  e.target.reset();
});

// 1. Element Selectors
const els = {
  categories: document.getElementById("categories"),
  productGrid: document.getElementById("productGrid"),
  trendingGrid: document.getElementById("trendingGrid"),
  detailsModal: document.getElementById("detailsModal"),
  detailsBody: document.getElementById("detailsBody"),
};

// 2. State Management
const state = {
  categories: [],
  selectedCategory: "all",
  cache: new Map(),
  allProducts: [],
  currentProducts: [],
};

// 3. Helper Functions
function truncate(text, n = 46) {
  return text.length > n ? text.slice(0, n) + "..." : text;
}

function starString(rate) {
  const r = Math.max(0, Math.min(5, Number(rate || 0)));
  return "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));
}

function money(n) {
  return `$${Number(n).toFixed(2)}`;
}

// 4. Modal Logic
function openModal(modalEl) {
  modalEl.classList.add("open");
  modalEl.setAttribute("aria-hidden", "false");
}

function closeModal(modalEl) {
  modalEl.classList.remove("open");
  modalEl.setAttribute("aria-hidden", "true");
}

// 5. Rendering Functions
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
          <button class="btn" data-add="${p.id}">Add to Cart</button>
        </div>
      </div>
    </article>
  `;
}

function renderProducts(list) {
  els.productGrid.innerHTML = list.map(cardHTML).join("");
}

function renderTrending(list) {
  els.trendingGrid.innerHTML = list.slice(0, 3).map(cardHTML).join("");
}

function renderCategories() {
  const all = ["all", ...state.categories];
  els.categories.innerHTML = all
    .map((c) => {
      const active = c === state.selectedCategory ? "active" : "";
      return `<button class="cat-btn ${active}" data-cat="${c}">${c}</button>`;
    })
    .join("");
}

// 6. Data Fetching
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

async function loadCategories() {
  state.categories = await fetchJSON(`${API}/products/categories`);
  renderCategories();
}

async function loadProducts(category = "all") {
  if (state.cache.has(category)) return state.cache.get(category);
  const url = category === "all" ? `${API}/products` : `${API}/products/category/${encodeURIComponent(category)}`;
  const products = await fetchJSON(url);
  state.cache.set(category, products);
  return products;
}

async function openDetails(id) {
  openModal(els.detailsModal);
  els.detailsBody.innerHTML = "<p style='color:#9aa7c7'>Loading details...</p>";
  try {
    const p = await fetchJSON(`${API}/products/${id}`);
    const rate = p?.rating?.rate ?? 0;
    els.detailsBody.innerHTML = `
      <div class="details-img"><img src="${p.image}" alt="${p.title}"></div>
      <div class="details-info">
        <h2>${p.title}</h2>
        <div class="details-row"><span class="badge">${p.category}</span><span>⭐ ${rate}</span></div>
        <p>${p.description}</p>
        <div class="details-row"><strong>${money(p.price)}</strong><span>In stock (demo)</span></div>
        <div class="details-actions">
          <button class="btn" data-close="details">Buy Now</button>
          <button class="btn" data-add="${p.id}">Add to Cart</button>
        </div>
      </div>`;
  } catch {
    els.detailsBody.innerHTML = "<p style='color:#9aa7c7'>Failed to load details.</p>";
  }
}

async function setCategory(category) {
  state.selectedCategory = category;
  renderCategories();
  try {
    const list = await loadProducts(category);
    state.currentProducts = list;
    renderProducts(list);
  } catch {
    els.productGrid.innerHTML = "<p style='color:#9aa7c7'>Failed to load products.</p>";
  }
}

// 7. Global Event Listeners
document.addEventListener("click", (e) => {
  const cat = e.target.closest("[data-cat]");
  if (cat) setCategory(cat.dataset.cat);

  const detailsBtn = e.target.closest("[data-details]");
  if (detailsBtn) openDetails(detailsBtn.dataset.details);

  const closeBtn = e.target.closest("[data-close='details']");
  if (closeBtn) closeModal(els.detailsModal);

  if (e.target.matches(".modal-backdrop[data-close='details']")) {
    closeModal(els.detailsModal);
  }
});

async function init() {
  try {
    const all = await loadProducts("all");
    state.allProducts = all;
    state.currentProducts = all;
    renderProducts(all);
    renderTrending(all);
    await loadCategories();
  } catch (err) {
    els.productGrid.innerHTML = "<p style='color:#9aa7c7'>Failed to load products.</p>";
  }
}

init();