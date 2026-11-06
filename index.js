
import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// =====================================
// K.H FRESH & FASHION - CUSTOMER PAGE
// HTML IDs સાથે મેળ ખાતો કોડ
// =====================================

const $ = id => document.getElementById(id);

let shops = [];
let products = [];
let cart = [];
let selectedShop = null;

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function money(value) {
  return "₹" + Number(value || 0).toFixed(2);
}

function isActive(data) {
  const status = String(data.status || "").toLowerCase();

  return data.active !== false &&
    data.isActive !== false &&
    status !== "off" &&
    status !== "inactive" &&
    status !== "બંધ";
}

function message(text) {
  const box = $("orderMessage");
  if (box) box.textContent = text;
}

// =====================================
// LOAD FIREBASE DATA
// =====================================

async function loadData() {
  const shopBox = $("shopList");

  shopBox.innerHTML = "<p>દુકાનો લોડ થઈ રહી છે...</p>";

  try {
    const [shopSnapshot, productSnapshot] = await Promise.all([
      getDocs(collection(db, "shops")),
      getDocs(collection(db, "products"))
    ]);

    shops = shopSnapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    products = productSnapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    shops = shops.filter(isActive);
    products = products.filter(isActive);

    renderShops();

  } catch (error) {
    console.error("Firebase Load Error:", error);

    shopBox.innerHTML = `
      <p style="color:red">
        દુકાનો લોડ થઈ શકી નથી.<br>
        Error: ${safe(error.code || error.message || "Unknown error")}
      </p>
    `;
  }
}

// =====================================
// SHOW SHOPS
// =====================================

function renderShops() {
  const box = $("shopList");

  if (!shops.length) {
    box.innerHTML = `
      <p>હાલમાં કોઈ ચાલુ દુકાન ઉપલબ્ધ નથી.</p>
      <p>દુકાન ચાલુ કરવા Admin Panel માં તપાસો.</p>
    `;
    return;
  }

  box.innerHTML = shops.map(shop => {
    const name = shop.name || shop.shopName || "દુકાન";
    const area = shop.area || shop.village || shop.location || "";
    const photo = shop.image || shop.photo || shop.shopImage || "";

    return `
      <div class="shop-card" data-shop="${safe(shop.id)}">
        ${
          photo
            ? `<img class="shop-photo" src="${safe(photo)}"
                alt="${safe(name)}" loading="lazy">`
            : `<div class="photo-placeholder">🏪 દુકાન</div>`
        }

        <h3>${safe(name)}</h3>
        <p>📍 ${safe(area)}</p>

        <button type="button">દુકાન જુઓ</button>
      </div>
    `;
  }).join("");

  box.querySelectorAll("[data-shop]").forEach(card => {
    card.addEventListener("click", () => {
      const shop = shops.find(item => item.id === card.dataset.shop);

      if (!shop) return;

      selectedShop = shop;

      $("selectedShopName").textContent =
        (shop.name || shop.shopName || "દુકાન") + " ની વસ્તુઓ";

      $("shopsSection").hidden = true;
      $("productsSection").hidden = false;

      renderProducts();

      $("productsSection").scrollIntoView({
        behavior: "smooth"
      });
    });
  });
}

// =====================================
// SHOW PRODUCTS
// =====================================

function renderProducts() {
  const box = $("productList");

  if (!selectedShop) {
    box.innerHTML = "<p>પહેલાં દુકાન પસંદ કરો.</p>";
    return;
  }

  const list = products.filter(product =>
    product.shopId === selectedShop.id
  );

  if (!list.length) {
    box.innerHTML = "<p>આ દુકાનમાં હાલમાં કોઈ પ્રોડક્ટ નથી.</p>";
    return;
  }

  box.innerHTML = list.map(product => {
    const name = product.name || product.title || "પ્રોડક્ટ";
    const price = Number(product.price || 0);
    const unit = product.unit || "નંગ";
    const photo = product.image || product.photo || product.imageUrl || "";

    return `
      <div class="product-card">
        ${
          photo
            ? `<img class="product-photo" src="${safe(photo)}"
                alt="${safe(name)}" loading="lazy">`
            : `<div class="photo-placeholder">🛍️ પ્રોડક્ટ</div>`
        }

        <div class="product-info">
          <h3>${safe(name)}</h3>
          <p>${safe(product.category || "સામાન")}</p>

          <p class="product-price">
            ${money(price)} / ${safe(unit)}
          </p>

          <button type="button" data-add="${safe(product.id)}">
            કાર્ટમાં ઉમેરો
          </button>
        </div>
      </div>
    `;
  }).join("");

  box.querySelectorAll("[data-add]").forEach(button => {
    button.addEventListener("click", () => {
      const product = products.find(
        item => item.id === button.dataset.add
      );

      if (product) addToCart(product);
    });
  });
}

// =====================================
// QUANTITY STEP
// =====================================

function getStep(product) {
  if (Number(product.step) > 0) {
    return Number(product.step);
  }

  const unit = String(product.unit || "").toLowerCase();

  if (unit === "kg" || unit === "કિલો") return 0.25;
  if (unit === "g" || unit === "ગ્રામ") return 250;

  return 1;
}

// =====================================
// CART
// =====================================

function addToCart(product) {
  if (!selectedShop || product.shopId !== selectedShop.id) {
    message("પ્રોડક્ટની દુકાન પસંદ કરો.");
    return;
  }

  const existing = cart.find(item => item.id === product.id);

  if (existing) {
    existing.quantity += getStep(product);
  } else {
    cart.push({
      id: product.id,
      shopId: product.shopId,
      name: product.name || product.title || "પ્રોડક્ટ",
      price: Number(product.price || 0),
      unit: product.unit || "નંગ",
      quantity: getStep(product)
    });
  }

  updateCart();
  message("પ્રોડક્ટ કાર્ટમાં ઉમેરાઈ ગઈ.");
}

function updateCart() {
  const box = $("cartItems");

  if (!cart.length) {
    box.innerHTML = "હજુ કોઈ વસ્તુ પસંદ કરી નથી.";
  } else {
    box.innerHTML = cart.map(item => `
      <div class="cart-item" style="padding:8px 0;border-bottom:1px solid #eee">
        <strong>${safe(item.name)}</strong>
        <p>
          ${money(item.price)} ×
          ${safe(item.quantity)} ${safe(item.unit)}
        </p>
        <strong>${money(item.price * item.quantity)}</strong>

        <div style="display:flex;gap:6px;margin-top:7px">
          <button type="button" data-minus="${safe(item.id)}">−</button>
          <button type="button" data-plus="${safe(item.id)}">+</button>
          <button type="button" data-remove="${safe(item.id)}">કાઢો</button>
        </div>
      </div>
    `).join("");
  }

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  $("cartTotal").textContent = money(total);

  box.querySelectorAll("[data-minus]").forEach(button => {
    button.addEventListener("click", () => {
      changeQuantity(button.dataset.minus, -1);
    });
  });

  box.querySelectorAll("[data-plus]").forEach(button => {
    button.addEventListener("click", () => {
      changeQuantity(button.dataset.plus, 1);
    });
  });

  box.querySelectorAll("[data-remove]").forEach(button => {
    button.addEventListener("click", () => {
      cart = cart.filter(item => item.id !== button.dataset.remove);
      updateCart();
    });
  });
}

function changeQuantity(id, direction) {
  const item = cart.find(i => i.id === id);
  if (!item) return;

  const product = products.find(p => p.id === id);
  const step = product ? getStep(product) : 1;

  item.quantity += step * direction;

  if (item.quantity <= 0) {
    cart = cart.filter(i => i.id !== id);
  } else {
    item.quantity = Math.round(item.quantity * 1000) / 1000;
  }

  updateCart();
}

// =====================================
// MINIMUM ORDER RULE
// =====================================

function checkMinimum(shop, total) {
  const rule = shop.minimumRule || shop.minType || "none";

  if (
    rule === "none" ||
    rule === "no-minimum"
  ) {
    return { valid: true };
  }

  if (rule === "amount500" || rule === "500") {
    return total >= 500
      ? { valid: true }
      : {
          valid: false,
          message: "આ દુકાનમાં ઓછામાં ઓછો ₹500 નો ઓર્ડર જરૂરી છે."
        };
  }

  if (rule === "custom") {
    const minimum = Number(
      shop.minimumValue || shop.minValue || 0
    );

    return total >= minimum
      ? { valid: true }
      : {
          valid: false,
          message: `ઓછામાં ઓછો ${money(minimum)} નો ઓર્ડર જરૂરી છે.`
        };
  }

  if (rule === "kg2" || rule === "2kg") {
    let totalKg = 0;

    cart.forEach(item => {
      const unit = String(item.unit).toLowerCase();

      if (unit === "kg" || unit === "કિલો") {
        totalKg += item.quantity;
      } else if (unit === "g" || unit === "ગ્રામ") {
        totalKg += item.quantity / 1000;
      }
    });

    return totalKg >= 2
      ? { valid: true }
      : {
          valid: false,
          message: `ઓછામાં ઓછો 2 કિલો ઓર્ડર જરૂરી છે. હાલ ${totalKg.toFixed(2)} કિલો છે.`
        };
  }

  return { valid: true };
}

// =====================================
// BACK TO SHOPS
// =====================================

$("backToShops").addEventListener("click", () => {
  $("productsSection").hidden = true;
  $("shopsSection").hidden = false;

  selectedShop = null;

  $("productList").innerHTML = "";
});

// =====================================
// ORDER TIME: 9 AM TO 6 PM
// =====================================

function isOrderTime() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();

  return minutes >= 540 && minutes <= 1080;
}

// =====================================
// WHATSAPP ORDER
// =====================================

$("customerOrderForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (!cart.length) {
    message("પહેલાં કાર્ટમાં પ્રોડક્ટ ઉમેરો.");
    return;
  }

  if (!isOrderTime()) {
    message("ઓર્ડરનો સમય સવારે 9 થી સાંજે 6 વાગ્યા સુધી છે.");
    return;
  }

  const name = $("customerName").value.trim();
  const phone = $("customerMobile").value.trim();
  const address = $("customerAddress").value.trim();

  if (!name || !phone || !address) {
    message("તમારી બધી માહિતી ભરો.");
    return;
  }

  if (!/^[6-9][0-9]{9}$/.test(phone)) {
    message("યોગ્ય 10 અંકનો મોબાઇલ નંબર લખો.");
    return;
  }

  const shop = shops.find(s => s.id === cart[0].shopId);

  if (!shop) {
    message("દુકાન મળી નથી.");
    return;
  }

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const minimum = checkMinimum(shop, total);

  if (!minimum.valid) {
    message(minimum.message);
    return;
  }

  const whatsapp = String(
    shop.whatsapp || shop.phone || shop.mobile || ""
  ).replace(/\D/g, "");

  if (whatsapp.length < 10) {
    message("દુકાનનો WhatsApp નંબર ઉપલબ્ધ નથી અથવા ખોટો છે.");
    return;
  }

  const orderNumber = "KH" + Date.now();

  const itemLines = cart.map((item, index) =>
    `${index + 1}. ${item.name} - ${item.quantity} ${item.unit} × ${money(item.price)} = ${money(item.price * item.quantity)}`
  ).join("\n");

  const whatsappMessage = `
*K.H Fresh & Fashion - નવો ઓર્ડર*

ઓર્ડર નંબર: ${orderNumber}
દુકાન: ${shop.name || shop.shopName || ""}

ગ્રાહક: ${name}
મોબાઇલ: ${phone}
સરનામું: ${address}

*પ્રોડક્ટ્સ:*
${itemLines}

કુલ રકમ: ${money(total)}

કૃપા કરીને ઓર્ડરની પુષ્ટિ કરો.
`;

  const button = $("whatsappOrderButton");
  button.disabled = true;
  button.textContent = "ઓર્ડર સેવ થઈ રહ્યો છે...";

  try {
    await addDoc(collection(db, "orders"), {
      orderNumber,
      shopId: shop.id,
      shopName: shop.name || shop.shopName || "",
      customerName: name,
      customerPhone: phone,
      customerAddress: address,
      items: cart.map(item => ({
        productId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        unit: item.unit
      })),
      total,
      status: "pending",
      createdAt: serverTimestamp()
    });

    const url =
      "https://wa.me/" +
      whatsapp +
      "?text=" +
      encodeURIComponent(whatsappMessage);

    window.location.href = url;

  } catch (error) {
    console.error("Order Error:", error);
    message(
      "ઓર્ડર સેવ થયો નથી: " +
      (error.code || error.message || "Firebase Error")
    );
  } finally {
    button.disabled = false;
    button.textContent = "WhatsApp પર ઓર્ડર મોકલો";
  }
});

// =====================================
// START
// =====================================

updateCart();
loadData();
