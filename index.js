
import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// =====================================
// K.H FRESH & FASHION - CUSTOMER SYSTEM
// =====================================

const $ = id => document.getElementById(id);

let shops = [];
let products = [];
let categories = [];
let cart = [];

let selectedShop = null;
let activeCategory = "all";
let searchText = "";

// =====================================
// SAFE TEXT
// =====================================

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

function imageUrl(value) {
  return value || "";
}

function notify(message) {
  const box = $("notification");
  if (!box) return;

  box.textContent = message;
  box.classList.remove("hidden");

  setTimeout(() => {
    box.classList.add("hidden");
  }, 3000);
}

function isActive(data) {
  return data.active !== false &&
    data.isActive !== false &&
    data.status !== "off" &&
    data.status !== "inactive";
}

// =====================================
// LOAD FIREBASE DATA
// =====================================

async function loadData() {
  try {
    $("shopList").innerHTML = "<p>દુકાનો લોડ થઈ રહી છે...</p>";
    $("productList").innerHTML = "<p>પ્રોડક્ટ્સ લોડ થઈ રહી છે...</p>";

    const [shopSnapshot, productSnapshot, categorySnapshot] =
      await Promise.all([
        getDocs(collection(db, "shops")),
        getDocs(collection(db, "products")),
        getDocs(collection(db, "categories"))
      ]);

    shops = shopSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    products = productSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    categories = categorySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    shops = shops.filter(isActive);
    products = products.filter(isActive);

    renderCategories();
    renderAreas();
    renderShops();
    renderProducts();

    $("shopCount").textContent = shops.length + " દુકાનો";

  } catch (error) {
    console.error("Firebase Error:", error);

    $("shopList").innerHTML =
      "<p>દુકાનો લોડ થઈ શકી નથી. Firebase Rules તપાસો.</p>";

    $("productList").innerHTML =
      "<p>પ્રોડક્ટ્સ લોડ થઈ શકી નથી.</p>";

    notify("Firebase કનેક્શનમાં સમસ્યા છે.");
  }
}

// =====================================
// CATEGORIES
// =====================================

function renderCategories() {
  const box = $("categoryList");

  const names = new Set([
    "બધી વસ્તુઓ",
    ...categories.map(c => c.name || c.title).filter(Boolean),
    ...products.map(p => p.category).filter(Boolean)
  ]);

  box.innerHTML = [...names].map(name => {
    const value = name === "બધી વસ્તુઓ" ? "all" : name;

    return `
      <button
        class="category-btn ${activeCategory === value ? "active" : ""}"
        data-category="${safe(value)}">
        ${safe(name)}
      </button>
    `;
  }).join("");

  box.querySelectorAll("[data-category]").forEach(button => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      renderCategories();
      renderProducts();
    });
  });
}

// =====================================
// AREA FILTER
// =====================================

function renderAreas() {
  const select = $("areaFilter");
  const previous = select.value;

  const areas = [...new Set(
    shops.map(s => s.area || s.village || s.location).filter(Boolean)
  )];

  select.innerHTML =
    '<option value="">બધા વિસ્તાર</option>' +
    areas.map(area =>
      `<option value="${safe(area)}">${safe(area)}</option>`
    ).join("");

  if (areas.includes(previous)) {
    select.value = previous;
  }
}

// =====================================
// SHOPS
// =====================================

function renderShops() {
  const box = $("shopList");

  const area = $("areaFilter").value;

  const filtered = shops.filter(shop => {
    const shopArea = shop.area || shop.village || shop.location || "";

    const matchesArea = !area || shopArea === area;

    const matchesSearch =
      !searchText ||
      String(shop.name || shop.shopName || "")
        .toLowerCase().includes(searchText) ||
      String(shopArea).toLowerCase().includes(searchText);

    return matchesArea && matchesSearch;
  });

  $("shopCount").textContent = filtered.length + " દુકાનો";

  if (!filtered.length) {
    box.innerHTML = "<p>આ વિસ્તારમાં કોઈ દુકાન મળી નથી.</p>";
    return;
  }

  box.innerHTML = filtered.map(shop => {
    const name = shop.name || shop.shopName || "દુકાન";
    const areaName = shop.area || shop.village || shop.location || "";
    const photo = imageUrl(shop.image || shop.photo || shop.shopImage);

    return `
      <div class="shop-card" data-shop="${safe(shop.id)}">
        ${photo
          ? `<img src="${safe(photo)}" alt="${safe(name)}" loading="lazy">`
          : `<div class="shop-placeholder">🏪</div>`
        }
        <h3>${safe(name)}</h3>
        <p>📍 ${safe(areaName)}</p>
        <p>દુકાન જુઓ →</p>
      </div>
    `;
  }).join("");

  box.querySelectorAll("[data-shop]").forEach(card => {
    card.addEventListener("click", () => {
      const shop = shops.find(s => s.id === card.dataset.shop);

      if (shop) {
        selectedShop = shop;
        $("productHeading").textContent =
          (shop.name || shop.shopName || "દુકાન") + " ની વસ્તુઓ";

        renderProducts();

        $("productList").scrollIntoView({
          behavior: "smooth"
        });
      }
    });
  });
}

// =====================================
// PRODUCTS
// =====================================

function renderProducts() {
  const box = $("productList");

  let filtered = products.filter(product => {
    const categoryMatch =
      activeCategory === "all" ||
      product.category === activeCategory;

    const shopMatch =
      !selectedShop || product.shopId === selectedShop.id;

    const productName =
      String(product.name || product.title || "").toLowerCase();

    const searchMatch =
      !searchText ||
      productName.includes(searchText) ||
      String(product.category || "").toLowerCase().includes(searchText);

    return categoryMatch && shopMatch && searchMatch;
  });

  if (!filtered.length) {
    box.innerHTML = "<p>હાલમાં કોઈ પ્રોડક્ટ ઉપલબ્ધ નથી.</p>";
    return;
  }

  box.innerHTML = filtered.map(product => {
    const name = product.name || product.title || "પ્રોડક્ટ";
    const price = Number(product.price || 0);
    const unit = product.unit || "નંગ";
    const photo = imageUrl(product.image || product.photo || product.imageUrl);

    const shop = shops.find(s => s.id === product.shopId);
    const shopName = shop
      ? (shop.name || shop.shopName || "")
      : "";

    return `
      <div class="product-card">
        ${photo
          ? `<img src="${safe(photo)}" alt="${safe(name)}" loading="lazy">`
          : `<div class="product-placeholder">🛍️</div>`
        }

        <div class="product-info">
          <h3>${safe(name)}</h3>
          <p>${safe(product.category || "સામાન")}</p>
          <p>${safe(shopName)}</p>

          <div class="product-price">
            ${money(price)} / ${safe(unit)}
          </div>

          <button
            class="add-button"
            data-add="${safe(product.id)}">
            કાર્ટમાં ઉમેરો
          </button>
        </div>
      </div>
    `;
  }).join("");

  box.querySelectorAll("[data-add]").forEach(button => {
    button.addEventListener("click", () => {
      const product = products.find(
        p => p.id === button.dataset.add
      );

      if (product) addToCart(product);
    });
  });
}

// =====================================
// CART
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

function addToCart(product) {
  const shop = shops.find(s => s.id === product.shopId);

  if (!shop) {
    notify("આ પ્રોડક્ટની દુકાન ઉપલબ્ધ નથી.");
    return;
  }

  if (cart.length && cart[0].shopId !== product.shopId) {
    notify("એક સમયે એક જ દુકાનમાંથી ઓર્ડર કરી શકશો.");
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
  notify("પ્રોડક્ટ કાર્ટમાં ઉમેરાઈ ગઈ.");
}

function updateCart() {
  const box = $("cartItems");

  if (!cart.length) {
    box.innerHTML = "<p>તમારો કાર્ટ ખાલી છે.</p>";
  } else {
    box.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div>
          <strong>${safe(item.name)}</strong>
          <p>${money(item.price)} × ${safe(item.quantity)} ${safe(item.unit)}</p>
          <strong>${money(item.price * item.quantity)}</strong>
        </div>

        <div>
          <button data-minus="${safe(item.id)}">−</button>
          <button data-plus="${safe(item.id)}">+</button>
          <button data-remove="${safe(item.id)}">✕</button>
        </div>
      </div>
    `).join("");
  }

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  $("cartTotal").textContent = money(total);

  $("cartCount").textContent = cart.reduce(
    (sum, item) => sum + 1,
    0
  );

  box.querySelectorAll("[data-minus]").forEach(button => {
    button.addEventListener("click", () => changeQuantity(button.dataset.minus, -1));
  });

  box.querySelectorAll("[data-plus]").forEach(button => {
    button.addEventListener("click", () => changeQuantity(button.dataset.plus, 1));
  });

  box.querySelectorAll("[data-remove]").forEach(button => {
    button.addEventListener("click", () => removeItem(button.dataset.remove));
  });
}

function changeQuantity(id, direction) {
  const item = cart.find(i => i.id === id);
  if (!item) return;

  const product = products.find(p => p.id === id);
  const step = product ? getStep(product) : 1;

  item.quantity += step * direction;

  if (item.quantity <= 0) {
    removeItem(id);
    return;
  }

  item.quantity = Math.round(item.quantity * 1000) / 1000;
  updateCart();
}

function removeItem(id) {
  cart = cart.filter(item => item.id !== id);

  if (!cart.length) {
    selectedShop = null;
    $("productHeading").textContent = "બધી પ્રોડક્ટ્સ";
  }

  updateCart();
  renderProducts();
}

// =====================================
// SHOP MINIMUM RULES
// =====================================

function checkMinimum(shop, total) {
  const rule = shop.minimumRule || shop.minType || "none";

  if (rule === "none" || rule === "no-minimum") {
    return { valid: true };
  }

  if (rule === "amount500" || rule === "500") {
    return total >= 500
      ? { valid: true }
      : {
          valid: false,
          message: "આ દુકાનમાં ઓછામાં ઓછો ₹500 નો ઓર્ડર કરવો પડશે."
        };
  }

  if (rule === "custom") {
    const minimum = Number(shop.minimumValue || shop.minValue || 0);

    return total >= minimum
      ? { valid: true }
      : {
          valid: false,
          message: `આ દુકાનમાં ઓછામાં ઓછો ${money(minimum)} નો ઓર્ડર કરવો પડશે.`
        };
  }

  if (rule === "kg2" || rule === "2kg") {
    let totalKg = 0;

    cart.forEach(item => {
      const unit = String(item.unit).toLowerCase();

      if (unit === "kg" || unit === "કિલો") {
        totalKg += item.quantity;
      }

      if (unit === "g" || unit === "ગ્રામ") {
        totalKg += item.quantity / 1000;
      }
    });

    return totalKg >= 2
      ? { valid: true }
      : {
          valid: false,
          message: `આ દુકાનમાં ઓછામાં ઓછો 2 કિલો ઓર્ડર જરૂરી છે. હાલ ${totalKg.toFixed(2)} કિલો છે.`
        };
  }

  return { valid: true };
}

// =====================================
// CART OPEN / CLOSE
// =====================================

function openCart() {
  $("cartPanel").classList.remove("hidden");
  $("cartOverlay").classList.remove("hidden");
}

function closeCart() {
  $("cartPanel").classList.add("hidden");
  $("cartOverlay").classList.add("hidden");
}

$("cartToggle").addEventListener("click", openCart);
$("closeCart").addEventListener("click", closeCart);
$("cartOverlay").addEventListener("click", closeCart);

// =====================================
// SEARCH
// =====================================

$("searchInput").addEventListener("input", event => {
  searchText = event.target.value.trim().toLowerCase();

  renderShops();
  renderProducts();
});

$("areaFilter").addEventListener("change", renderShops);

$("showAllProducts").addEventListener("click", () => {
  selectedShop = null;
  activeCategory = "all";

  $("productHeading").textContent = "બધી પ્રોડક્ટ્સ";

  renderCategories();
  renderProducts();
});

// =====================================
// ORDER TIME
// =====================================

function isOrderTime() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();

  return minutes >= 540 && minutes <= 1080;
}

// =====================================
// WHATSAPP ORDER
// =====================================

$("placeOrder").addEventListener("click", async () => {
  if (!cart.length) {
    notify("પહેલાં કાર્ટમાં પ્રોડક્ટ ઉમેરો.");
    return;
  }

  if (!isOrderTime()) {
    notify("ઓર્ડરનો સમય સવારે 9 થી સાંજે 6 વાગ્યા સુધી છે.");
    return;
  }

  const name = $("customerName").value.trim();
  const phone = $("customerPhone").value.trim();
  const address = $("customerAddress").value.trim();

  if (!name || !phone || !address) {
    notify("નામ, મોબાઇલ નંબર અને સરનામું લખો.");
    return;
  }

  if (!/^[0-9]{10}$/.test(phone)) {
    notify("યોગ્ય 10 અંકનો મોબાઇલ નંબર લખો.");
    return;
  }

  const shop = shops.find(s => s.id === cart[0].shopId);

  if (!shop) {
    notify("દુકાન મળી નથી.");
    return;
  }

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const minimum = checkMinimum(shop, total);

  if (!minimum.valid) {
    notify(minimum.message);
    return;
  }

  const whatsapp = String(
    shop.whatsapp || shop.phone || shop.mobile || ""
  ).replace(/\D/g, "");

  if (!whatsapp) {
    notify("આ દુકાનનો WhatsApp નંબર ઉપલબ્ધ નથી.");
    return;
  }

  if (whatsapp.length < 10) {
    notify("દુકાનનો WhatsApp નંબર તપાસવો જરૂરી છે.");
    return;
  }

  const orderNumber = "KH" + Date.now();

  const itemLines = cart.map((item, index) =>
    `${index + 1}. ${item.name} - ${item.quantity} ${item.unit} × ${money(item.price)} = ${money(item.price * item.quantity)}`
  ).join("\n");

  const message = `
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

  const orderData = {
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
  };

  const button = $("placeOrder");
  button.disabled = true;
  button.textContent = "ઓર્ડર સેવ થઈ રહ્યો છે...";

  try {
    await addDoc(collection(db, "orders"), orderData);

    const url =
      "https://wa.me/" +
      whatsapp +
      "?text=" +
      encodeURIComponent(message);

    window.open(url, "_blank");

    notify("ઓર્ડર સેવ થયો. હવે WhatsApp માં મોકલો.");

    cart = [];
    updateCart();
    closeCart();

  } catch (error) {
    console.error("Order Error:", error);
    notify("ઓર્ડર સેવ થયો નથી. ફરી પ્રયાસ કરો.");
  } finally {
    button.disabled = false;
    button.textContent = "WhatsApp પર ઓર્ડર કરો";
  }
});

// =====================================
// START CUSTOMER PAGE
// =====================================

updateCart();
loadData();
