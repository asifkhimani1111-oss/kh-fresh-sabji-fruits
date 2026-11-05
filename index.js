
import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let shops = [];
let products = [];
let selectedShop = null;
let cart = [];

const shopList = document.getElementById("shopList");
const productList = document.getElementById("productList");
const orderForm = document.getElementById("customerOrderForm");
const orderMessage = document.getElementById("orderMessage");
const orderButton = document.getElementById("whatsappOrderButton");

const productsSection = document.getElementById("productsSection");
const backButton = document.getElementById("backToShops");

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function getPhotoSource(item) {
  return item.photoBase64 || item.imageUrl || item.photoUrl || "";
}

function addPhoto(parent, item, altText, className) {
  const source = getPhotoSource(item);

  if (!source) {
    const placeholder = document.createElement("div");
    placeholder.className = className + " photo-placeholder";
    placeholder.textContent = "ફોટો ઉપલબ્ધ નથી";
    parent.appendChild(placeholder);
    return;
  }

  const image = document.createElement("img");
  image.className = className;
  image.src = source;
  image.alt = altText;
  image.loading = "lazy";

  image.onerror = () => {
    image.style.display = "none";
  };

  parent.appendChild(image);
}

function getExpiryDate(shop) {
  if (!shop.activeUntil) return null;

  if (typeof shop.activeUntil.toDate === "function") {
    return shop.activeUntil.toDate();
  }

  const date = new Date(shop.activeUntil);

  return Number.isNaN(date.getTime()) ? null : date;
}

function isShopAvailable(shop) {
  if (shop.approved !== true || shop.active !== true) {
    return false;
  }

  const expiry = getExpiryDate(shop);

  return expiry !== null && expiry > new Date();
}

function showOrderMessage(message, isError = false) {
  orderMessage.textContent = message;
  orderMessage.style.color = isError ? "red" : "green";
}

function loadData() {
  shopList.textContent = "દુકાનો લોડ થઈ રહી છે...";

  const shopQuery = query(
    collection(db, "shops"),
    where("approved", "==", true)
  );

  const productQuery = query(
    collection(db, "products"),
    where("approved", "==", true)
  );

  Promise.all([
    getDocs(shopQuery),
    getDocs(productQuery)
  ])
    .then(([shopSnapshot, productSnapshot]) => {

      shops = shopSnapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      })).filter(isShopAvailable);

      products = productSnapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      }));

      showShops();
    })
    .catch(error => {
      console.error(error);
      shopList.textContent =
        "ડેટા લોડ કરવામાં ભૂલ: " + error.message;
    });
}

function showShops() {
  shopList.innerHTML = "";

  if (!shops.length) {
    shopList.textContent =
      "હાલમાં કોઈ ચાલુ દુકાન ઉપલબ્ધ નથી.";
    return;
  }

  shops.forEach(shop => {
    const card = document.createElement("div");
    card.className = "shop-card";

    addPhoto(card, shop, shop.name, "shop-photo");

    const heading = document.createElement("h3");
    heading.textContent = shop.name;

    const category = document.createElement("p");
    category.textContent = shop.category || "";

    const area = document.createElement("p");
    area.textContent = shop.area || "";

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "દુકાન ખોલો";

    button.addEventListener("click", () => {
      openShop(shop.id);
    });

    card.append(heading, category, area, button);
    shopList.appendChild(card);
  });
}

function openShop(id) {
  const shop = shops.find(item => item.id === id);

  if (!shop || !isShopAvailable(shop)) {
    alert("આ દુકાન હાલમાં બંધ છે.");
    return;
  }

  // બીજી દુકાન ખોલતાં જૂની કાર્ટ ખાલી કરો.
  if (!selectedShop || selectedShop.id !== id) {
    cart = [];
    showCart();
  }

  selectedShop = shop;

  productsSection.hidden = false;

  document.getElementById("selectedShopName").textContent =
    selectedShop.name;

  productList.innerHTML = "";

  const shopProducts = products.filter(product =>
    product.shopId === selectedShop.id
  );

  if (!shopProducts.length) {
    productList.textContent =
      "આ દુકાનમાં હજુ કોઈ વસ્તુ નથી.";
    return;
  }

  shopProducts.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";

    addPhoto(card, product, product.name, "product-photo");

    const heading = document.createElement("h3");
    heading.textContent = product.name;

    const price = document.createElement("p");
    price.textContent =
      "₹" + Number(product.price) + " / " + (product.unit || "");

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "કાર્ટમાં ઉમેરો";

    button.addEventListener("click", () => {
      addToCart(product.id);
    });

    card.append(heading, price, button);
    productList.appendChild(card);
  });

  productsSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function goBackToShops() {
  cart = [];
  selectedShop = null;

  productList.innerHTML = "";
  productsSection.hidden = true;

  showCart();

  shopList.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function addToCart(id) {
  if (!selectedShop || !isShopAvailable(selectedShop)) {
    alert("આ દુકાન હાલમાં બંધ છે.");
    return;
  }

  const product = products.find(product =>
    product.id === id &&
    product.shopId === selectedShop.id
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

function showCart() {
  const cartItems = document.getElementById("cartItems");

  if (!cart.length) {
    cartItems.textContent =
      "હજુ કોઈ વસ્તુ પસંદ કરી નથી.";
  } else {
    cartItems.innerHTML = cart.map(item => `
      <div>
        ${safeText(item.name)}
        × ${item.quantity}
        = ₹${Number(item.price) * item.quantity}
      </div>
    `).join("");
  }

  const total = cart.reduce(
    (sum, item) =>
      sum + Number(item.price) * item.quantity,
    0
  );

  document.getElementById("cartTotal").textContent =
    "₹" + total.toFixed(2);
}

function isOrderTimeAllowed() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();

  return minutes >= 9 * 60 && minutes <= 18 * 60;
}

function getWhatsappNumber(shop) {
  const digits = String(shop.whatsapp || "").replace(/\D/g, "");

  if (!/^[6-9][0-9]{9}$/.test(digits)) {
    return null;
  }

  return "91" + digits;
}

function createOrderMessage(customer, shop, total) {
  let message = "";

  message += "નમસ્તે " + shop.name + ",\n";
  message += "મારે ઓર્ડર આપવો છે.\n\n";

  message += "ગ્રાહકનું નામ: " + customer.name + "\n";
  message += "મોબાઇલ નંબર: " + customer.mobile + "\n";
  message += "સરનામું: " + customer.address + "\n\n";

  message += "ઓર્ડરની વસ્તુઓ:\n";

  cart.forEach((item, index) => {
    const itemTotal = Number(item.price) * item.quantity;

    message +=
      (index + 1) + ". " +
      item.name +
      " × " + item.quantity +
      " " + (item.unit || "") +
      " = ₹" + itemTotal.toFixed(2) + "\n";
  });

  message += "\nકુલ બિલ: ₹" + total.toFixed(2);
  message += "\n\nકૃપા કરીને ઓર્ડરની પુષ્ટિ કરો.";

  return message;
}

// ગ્રાહકનો ઓર્ડર અને WhatsApp
orderForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  if (!cart.length) {
    showOrderMessage(
      "પહેલા કોઈ વસ્તુ કાર્ટમાં ઉમેરો.",
      true
    );
    return;
  }

  if (!selectedShop || !isShopAvailable(selectedShop)) {
    showOrderMessage(
      "દુકાન હાલમાં ઉપલબ્ધ નથી.",
      true
    );
    return;
  }

  if (!isOrderTimeAllowed()) {
    showOrderMessage(
      "ઓર્ડરનો સમય સવારે 9 થી સાંજે 6 વાગ્યા સુધી છે.",
      true
    );
    return;
  }

  const whatsappNumber = getWhatsappNumber(selectedShop);

  if (!whatsappNumber) {
    showOrderMessage(
      "આ દુકાનનો WhatsApp નંબર ઉપલબ્ધ નથી.",
      true
    );
    return;
  }

  const name =
    document.getElementById("customerName").value.trim();

  const mobile =
    document.getElementById("customerMobile").value.trim();

  const address =
    document.getElementById("customerAddress").value.trim();

  if (!name || !address || !/^[6-9][0-9]{9}$/.test(mobile)) {
    showOrderMessage(
      "તમારું નામ, સાચો 10 અંકનો મોબાઇલ નંબર અને સરનામું ભરો.",
      true
    );
    return;
  }

  const total = cart.reduce(
    (sum, item) =>
      sum + Number(item.price) * item.quantity,
    0
  );

  const items = cart.map(item => ({
    productId: item.id,
    productName: item.name,
    quantity: item.quantity,
    price: Number(item.price),
    unit: item.unit || "",
    imageUrl: item.imageUrl || item.photoUrl || ""
  }));

  const customer = { name, mobile, address };

  const message = createOrderMessage(
    customer,
    selectedShop,
    total
  );

  const whatsappUrl =
    "https://wa.me/" +
    whatsappNumber +
    "?text=" +
    encodeURIComponent(message);

  orderButton.disabled = true;
  orderButton.textContent = "ઓર્ડર સાચવાઈ રહ્યો છે...";

  try {
    await addDoc(collection(db, "orders"), {
      shopId: selectedShop.id,
      shopName: selectedShop.name,
      sellerWhatsapp: selectedShop.whatsapp,
      customerName: name,
      customerMobile: mobile,
      customerAddress: address,
      items: items,
      total: total,
      status: "new",
      createdAt: serverTimestamp()
    });

    showOrderMessage(
      "ઓર્ડર સાચવાઈ ગયો છે. હવે WhatsApp ખુલશે."
    );

    window.location.href = whatsappUrl;

  } catch (error) {
    console.error(error);

    showOrderMessage(
      "ઓર્ડર સાચવવામાં ભૂલ: " + error.message,
      true
    );

  } finally {
    orderButton.disabled = false;
    orderButton.textContent = "WhatsApp પર ઓર્ડર મોકલો";
  }
});

// પાછા જવાનો બટન
if (backButton) {
  backButton.addEventListener("click", goBackToShops);
}

// જૂના HTMLમાં search input હોય તો તેને છુપાવો.
const shopSearch = document.getElementById("shopSearch");

if (shopSearch) {
  shopSearch.hidden = true;
}

showCart();
loadData();
