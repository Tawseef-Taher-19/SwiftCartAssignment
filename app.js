const API = "https://fakestoreapi.com";

document.getElementById("year").textContent = String(new Date().getFullYear());

document.getElementById("newsletterForm").addEventListener("submit", (e) => {
  e.preventDefault();
  alert("Subscribed (demo)!");
  e.target.reset();
});

const state = {
  categories: [],
  selectedCategory: "all",
  cache: new Map(), // key: category -> products[]
  allProducts: [],
  currentProducts: [],
};

function truncate(text, n = 46) {
  return text.length > n ? text.slice(0, n) + "..." : text;
}

function starString(rate) {
  const r = Math.max(0, Math.min(5, Number(rate || 0)));
  const full = Math.round(r);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function money(n) {
  return `$${Number(n).toFixed(2)}`;
}

function cardHTML(p) {
  const rate = p?.rating?.rate ?? 0;
  return `
    <article class="card">
      <div class="card-img">
        <img src="${p.image}" alt="${p.title}">
      </div>
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
  document.getElementById("productGrid").innerHTML = list.map(cardHTML).join("");
}

function renderTrending(list) {
  document.getElementById("trendingGrid").innerHTML = list.slice(0, 3).map(cardHTML).join("");
}

function renderCategories() {
  const wrap = document.getElementById("categories");
  if (!wrap) return;
  const all = ["all", ...state.categories];

  wrap.innerHTML = all
    .map((c) => {
      const active = c === state.selectedCategory ? "active" : "";
      return `<button class="cat-btn ${active}" data-cat="${c}">${c}</button>`;
    })
    .join("");
}

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

  const url =
    category === "all"
      ? `${API}/products`
      : `${API}/products/category/${encodeURIComponent(category)}`;

  const products = await fetchJSON(url);
  state.cache.set(category, products);
  return products;
}

async function setCategory(category) {
  state.selectedCategory = category;
  renderCategories();

  try {
    const list = await loadProducts(category);
    state.currentProducts = list;
    renderProducts(list);
  } catch {
    document.getElementById("productGrid").innerHTML = "<p style='color:#9aa7c7'>Failed to load products.</p>";
  }
}

document.addEventListener("click", (e) => {
  const cat = e.target.closest("[data-cat]");
  if (cat) setCategory(cat.dataset.cat);
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
    document.getElementById("productGrid").innerHTML = "<p style='color:#9aa7c7'>Failed to load products.</p>";
  }
}

init();