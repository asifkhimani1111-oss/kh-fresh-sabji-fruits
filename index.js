
const KEY = "kh_fresh_fashion_data";

const demoData = {
  shops: [
    {
      id: "shop1",
      name: "K.H Fresh Sabji & Fruits",
      category: "ફળો અને શાકભાજી",
      area: "તમારો વિસ્તાર",
      approved: true,
      products: [
        { id: "p1", name: "બટાકા", price: 30, unit: "કિલો" },
        { id: "p2", name: "ડુંગળી", price: 35, unit: "કિલો" },
        { id: "p3", name: "કેળા", price: 60, unit: "ડઝન" }
      ]
    }
  ]
};

let data;

try {
  data = JSON.parse(localStorage.getItem(KEY)) || demoData;
} catch (error) {
  data = demoData;
}

let selectedShop = null;
let cart = [];

const shopList = document.getElementById("shopList");
const productList = document.getElementById("productList");

function safeText(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showShops() {
  const search = document
    .getElementById("shopSearch")
    .value.toLowerCase();

  const shops = data.shops.filter(shop =>
    shop.approved &&
    (shop.name + shop.category + shop.area)
      .toLowerCase()
      .includes(search)
  );

  shopList.innerHTML = "";

  if (shops.length === 0) {
    shopList.textContent = "હાલમાં કોઈ દુકાન ઉપલબ્ધ નથી.";
    return;
  }

  shops.forEach(shop => {
    const card = document.createElement("div");
    card.className = "shop-card";

    card.innerHTML = `
      <h3>${safeText(shop.name)}</h3>
      <p>${safeText(shop.category)}</p>
      <p>${safeText(shop.area)}</p>
      <button>દુકાન જુઓ</button>
    `;

    card.querySelector("button").onclick = () => openShop(shop.id);
    shopList.appendChild(card);
  });
}

function openShop(id) {
  selectedShop = data.shops.find(shop => shop.id === id);

  if (!selectedShop) return;

  document.getElementById("productsSection").hidden = false;
  document.getElementById("selectedShopName").textContent =
    selectedShop.name;

  productList.innerHTML = "";

  selectedShop.products.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <h3>${safeText(product.name)}</h3>
      <p>₹${Number(product.price)} / ${safeText(product.unit)}</p>
      <button>કાર્ટમાં ઉમેરો</button>
    `;

    card.querySelector("button").onclick = () =>
      addToCart(product.id);

    productList.appendChild(card);
  });
}

function addToCart(id) {
  const product = selectedShop.products.find(p => p.id === id);

  if (!product) return;

  if (cart.length && cart[0].shopId !== selectedShop.id) {
    alert("એક સમયે એક જ દુકાનમાંથી ખરીદી કરી શકાશે.");
    return;
  }

  const existing = cart.find(item => item.id === id);

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({
      ...product,
      quantity: 1,
      shopId: selectedShop.id
    });
  }

  showCart();
}

function showCart() {
  const cartItems = document.getElementById("cartItems");

  if (cart.length === 0) {
    cartItems.textContent = "હજુ કોઈ વસ્તુ પસંદ કરી નથી.";
  } else {
    cartItems.innerHTML = cart.map(item => `
      <div>
        ${safeText(item.name)} × ${item.quantity}
        = ₹${item.price * item.quantity}
      </div>
    `).join("");
  }

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  document.getElementById("cartTotal").textContent = "₹" + total;
}

document.getElementById("shopSearch")
  .addEventListener("input", showShops);

document.getElementById("backToShops")
  .addEventListener("click", () => {
    document.getElementById("productsSection").hidden = true;
    selectedShop = null;
  });

showShops();
showCart();
