
import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let shops = [];
let products = [];
let selectedShop = null;
let cart = [];

const shopList = document.getElementById("shopList");
const productList = document.getElementById("productList");

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// Firebaseમાંથી મંજૂર દુકાનો અને વસ્તુઓ લાવો
async function loadData() {
  shopList.textContent = "દુકાનો લોડ થઈ રહી છે...";

  try {
    const shopQuery = query(
      collection(db, "shops"),
      where("approved", "==", true)
    );

    const productQuery = query(
      collection(db, "products"),
      where("approved", "==", true)
    );

    const [shopSnapshot, productSnapshot] = await Promise.all([
      getDocs(shopQuery),
      getDocs(productQuery)
    ]);

    shops = shopSnapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    products = productSnapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    showShops();

  } catch (error) {
    console.error("Firebase error:", error);
    shopList.textContent =
      "ડેટા લોડ કરવામાં ભૂલ: " + error.message;
  }
}

// દુકાનો બતાવો
function showShops() {
  const search = document.getElementById("shopSearch").value
    .toLowerCase()
    .trim();

  const filteredShops = shops.filter(shop =>
    (String(shop.name || "") +
     String(shop.category || "") +
     String(shop.area || ""))
      .toLowerCase()
      .includes(search)
  );

  shopList.innerHTML = "";

  if (!filteredShops.length) {
    shopList.textContent = "હાલમાં કોઈ દુકાન ઉપલબ્ધ નથી.";
    return;
  }

  filteredShops.forEach(shop => {
    const card = document.createElement("div");
    card.className = "shop-card";

    card.innerHTML = `
      <h3>${safeText(shop.name)}</h3>
      <p>${safeText(shop.category)}</p>
      <p>${safeText(shop.area)}</p>
      <button type="button">દુકાન જુઓ</button>
    `;

    card.querySelector("button").onclick = () =>
      openShop(shop.id);

    shopList.appendChild(card);
  });
}

// દુકાનની વસ્તુઓ બતાવો
function openShop(id) {
  selectedShop = shops.find(shop => shop.id === id);

  if (!selectedShop) return;

  document.getElementById("productsSection").hidden = false;

  document.getElementById("selectedShopName").textContent =
    selectedShop.name;

  productList.innerHTML = "";

  const shopProducts = products.filter(product =>
    product.shopId === selectedShop.id
  );

  if (!shopProducts.length) {
    productList.textContent = "આ દુકાનમાં હજુ કોઈ વસ્તુ નથી.";
    return;
  }

  shopProducts.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <h3>${safeText(product.name)}</h3>
      <p>₹${Number(product.price)} / ${safeText(product.unit)}</p>
      <button type="button">કાર્ટમાં ઉમેરો</button>
    `;

    card.querySelector("button").onclick = () =>
      addToCart(product.id);

    productList.appendChild(card);
  });
}

// કાર્ટમાં ઉમેરો
function addToCart(id) {
  if (!selectedShop) return;

  const product = products.find(p =>
    p.id === id && p.shopId === selectedShop.id
  );

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

// કાર્ટ બતાવો
function showCart() {
  const cartItems = document.getElementById("cartItems");

  if (!cart.length) {
    cartItems.textContent = "હજુ કોઈ વસ્તુ પસંદ કરી નથી.";
  } else {
    cartItems.innerHTML = cart.map(item => `
      <div>
        ${safeText(item.name)} × ${item.quantity}
        = ₹${Number(item.price) * item.quantity}
      </div>
    `).join("");
  }

  const total = cart.reduce(
    (sum, item) =>
      sum + Number(item.price) * item.quantity,
    0
  );

  document.getElementById("cartTotal").textContent = "₹" + total;
}

// Search
document.getElementById("shopSearch")
  .addEventListener("input", showShops);

// પાછા દુકાનોમાં
document.getElementById("backToShops")
  .addEventListener("click", () => {
    document.getElementById("productsSection").hidden = true;
    selectedShop = null;
  });

// શરૂઆત
showCart();
loadData();
