
import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = id => document.getElementById(id);

let shops = [];
let products = [];
let selectedShop = null;
let cart = {};
let activeCategory = "બધી વસ્તુઓ";
let searchText = "";
let sending = false;

const shopList = $("shopList");
const productList = $("productList");
const orderForm = $("customerOrderForm");
const orderMessage = $("orderMessage");
const orderButton = $("whatsappOrderButton");
const productsSection = $("productsSection");
const backButton = $("backToShops");

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[ch]);
}

function money(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  });
}

function getPhoto(item) {
  return item?.photoBase64 || item?.imageUrl || item?.photoUrl || "";
}

function makeImage(src, alt, className) {
  const img = document.createElement("img");
  img.className = className;
  img.alt = alt || "ફોટો";
  img.loading = "lazy";
  img.src = src;

  img.onerror = () => {
    img.replaceWith(makePlaceholder("📦", className));
  };

  return img;
}

function makePlaceholder(emoji, className) {
  const box = document.createElement("div");
  box.className = className + " photo-placeholder";
  box.textContent = emoji;
  return box;
}

/* દુકાનની સમયમર્યાદા */

function getExpiryDate(shop) {
  if (!shop?.activeUntil) return null;

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

/* ભારતનો સમય */

function indiaTimeParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  const hour = Number(
    parts.find(p => p.type === "hour")?.value || 0
  );

  const minute = Number(
    parts.find(p => p.type === "minute")?.value || 0
  );

  return {
    hour,
    minute,
    total: hour * 60 + minute
  };
}

function isOrderTimeAllowed() {
  const { total } = indiaTimeParts();

  return total >= 9 * 60 && total < 18 * 60;
}

function showClosedPage() {
  document.body.innerHTML = `
    <main class="closed-screen">
      <div class="closed-card">
        <div class="closed-icon">🕘</div>
        <h1>K.H Fresh &amp; Fashion</h1>
        <h2>હાલમાં ઓર્ડર બંધ છે</h2>
        <p>
          ઓર્ડરનો સમય સવારે <b>9:00</b>
          થી સાંજે <b>6:00</b> વાગ્યા સુધી છે.
        </p>
        <p>
          કૃપા કરીને ઓર્ડર આપવા આ સમય દરમિયાન ફરી મુલાકાત લો.
        </p>
        <div class="closed-hours">
          🟢 ઓર્ડર સમય: સવારે 9 થી સાંજે 6
        </div>
      </div>
    </main>
  `;
}

function checkPageTime() {
  if (!isOrderTimeAllowed()) {
    showClosedPage();
    return false;
  }

  return true;
}

/* દુકાનનો મિનિમમ નિયમ */

function getShopRule(shop) {
  const rule = String(shop?.rule || "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");

  if ([
    "veg2kg",
    "min2kg",
    "2kg",
    "minimum2kg",
    "minimum2kilogram"
  ].includes(rule)) {
    return "veg2kg";
  }

  if ([
    "amount500",
    "min500",
    "500",
    "minimum500"
  ].includes(rule)) {
    return "amount500";
  }

  if ([
    "none",
    "no",
    "nominimum",
    ""
  ].includes(rule)) {
    return "none";
  }

  return "none";
}

/* ફળ અને શાકની ઓળખ */

function isProduceShop(shop) {
  const value = [
    shop?.category,
    shop?.name,
    shop?.type
  ].join(" ").toLowerCase();

  return (
    value.includes("fruit") ||
    value.includes("ફળ") ||
    value.includes("શાક") ||
    value.includes("vegetable") ||
    value.includes("sabji")
  );
}

function isBanana(product) {
  const name = String(product?.name || "")
    .toLowerCase()
    .replace(/\s/g, "");

  return (
    name.includes("banana") ||
    name.includes("kela") ||
    name.includes("કેળા") ||
    name.includes("કેળું")
  );
}

/* યુનિટની ઓળખ */

function isKgUnit(product) {
  const unit = String(product?.unit || "")
    .toLowerCase()
    .trim();

  return (
    unit.includes("kg") ||
    unit.includes("kilo") ||
    unit.includes("kilogram") ||
    unit.includes("કિલો") ||
    unit.includes("કિગ્રા") ||
    unit.includes("કિલોગ્રામ")
  );
}

function isGramUnit(product) {
  const unit = String(product?.unit || "")
    .toLowerCase()
    .trim();

  return (
    unit.includes("ગ્રામ") ||
    unit.includes("gram")
  );
}

/* 2 કિલોના નિયમવાળી દુકાનમાં જ વજનના સ્ટેપ */

function isProduceQuantity(product) {
  return !!selectedShop &&
    getShopRule(selectedShop) === "veg2kg" &&
    (
      isKgUnit(product) ||
      isBanana(product) ||
      isGramUnit(product)
    );
}

/* જથ્થો */

function quantityStep(product) {
  if (isProduceQuantity(product)) {
    if (isBanana(product)) {
      return 3;
    }

    return 250;
  }

  return 1;
}

/* જથ્થાનું લખાણ */

function quantityLabel(product, quantity) {
  if (isProduceQuantity(product)) {
    if (isBanana(product)) {
      return quantity + " પીસ";
    }

    return quantity >= 1000
      ? money(quantity / 1000) + " કિલો"
      : quantity + " ગ્રામ";
  }

  return quantity + " " + (product.unit || "નંગ");
}

/* કિંમતની ગણતરી */

function itemPrice(product, quantity) {
  const price = Number(product.price || 0);

  if (isProduceQuantity(product)) {
    if (isBanana(product)) {
      return (quantity / 12) * price;
    }

    return (quantity / 1000) * price;
  }

  return quantity * price;
}

/* વજનની ગણતરી */

function itemWeight(product, quantity) {
  if (!isProduceQuantity(product)) {
    return 0;
  }

  if (isBanana(product)) {
    return (quantity / 12) * 1000;
  }

  return quantity;
}

/* પ્રોડક્ટની કિંમત બતાવવી */

function productPriceLabel(product) {
  if (isKgUnit(product) || isGramUnit(product)) {
    return `₹${money(product.price)} / કિલો`;
  }

  return `₹${money(product.price)} / ${product.unit || "નંગ"}`;
}

/* કાર્ટની કુલ ગણતરી */

function getTotals() {
  let total = 0;
  let weight = 0;

  Object.values(cart).forEach(item => {
    total += itemPrice(item.product, item.quantity);
    weight += itemWeight(item.product, item.quantity);
  });

  return { total, weight };
}

/* મિનિમમ ઓર્ડર તપાસ */

function getMinimumStatus() {
  if (!selectedShop) {
    return {
      allowed: false,
      message: "પહેલા દુકાન પસંદ કરો."
    };
  }

  const rule = getShopRule(selectedShop);
  const { total, weight } = getTotals();

  if (!Object.keys(cart).length) {
    return {
      allowed: false,
      message: "પહેલા કાર્ટમાં વસ્તુ ઉમેરો."
    };
  }

  if (rule === "veg2kg") {
    if (weight < 2000) {
      return {
        allowed: false,
        message:
          `ઓર્ડર માટે હજી ${money(2000 - weight)} ગ્રામ ઉમેરો. ઓછામાં ઓછું 2 કિલો જરૂરી છે.`
      };
    }

    return {
      allowed: true,
      message: "✅ 2 કિલોનો મિનિમમ ઓર્ડર પૂરો થયો."
    };
  }

  if (rule === "amount500") {
    if (total < 500) {
      return {
        allowed: false,
        message:
          `ઓર્ડર માટે હજી ₹${money(500 - total)} ઉમેરો. ઓછામાં ઓછો ઓર્ડર ₹500 છે.`
      };
    }

    return {
      allowed: true,
      message: "✅ ₹500નો મિનિમમ ઓર્ડર પૂરો થયો."
    };
  }

  return {
    allowed: true,
    message: "✅ આ દુકાનમાં કોઈ મિનિમમ ઓર્ડર નથી."
  };
}

/* દુકાન શોધ અને કેટેગરી */

function addShopTools() {
  const section = $("shopsSection");

  if (!section || $("shopSearchBox")) {
    return;
  }

  const search = document.createElement("input");

  search.id = "shopSearchBox";
  search.className = "search-box";
  search.placeholder = "🔍 દુકાનનું નામ અથવા વિસ્તાર શોધો";

  search.addEventListener("input", () => {
    searchText = search.value.trim().toLowerCase();
    renderShops();
  });

  const categories = document.createElement("div");

  categories.id = "shopCategories";
  categories.className = "category-strip";

  [
    ["બધી વસ્તુઓ", "🛍️"],
    ["ફળો", "🍎"],
    ["શાકભાજી", "🥦"],
    ["કરિયાણું", "🛒"],
    ["કપડાં", "👕"],
    ["ફૂટવેર", "👟"],
    ["જનરલ સ્ટોર", "🏪"]
  ].forEach(([name, emoji]) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "category-chip";
    button.textContent = `${emoji} ${name}`;

    button.addEventListener("click", () => {
      activeCategory = name;

      categories.querySelectorAll("button").forEach(b => {
        b.classList.toggle("selected", b === button);
      });

      renderShops();
    });

    if (name === activeCategory) {
      button.classList.add("selected");
    }

    categories.append(button);
  });

  const intro = section.querySelector("p");

  if (intro) {
    intro.after(search, categories);
  } else {
    section.prepend(search, categories);
  }
}

function matchesShopCategory(shop) {
  if (activeCategory === "બધી વસ્તુઓ") {
    return true;
  }

  const text =
    `${shop.category || ""} ${shop.name || ""}`.toLowerCase();

  const map = {
    "ફળો": ["fruit", "ફળ"],
    "શાકભાજી": ["vegetable", "શાક", "sabji"],
    "કરિયાણું": ["કરિયાણું", "kirana", "grocery"],
    "કપડાં": ["કપડાં", "clothing", "fashion"],
    "ફૂટવેર": ["ફૂટવેર", "footwear", "shoes"],
    "જનરલ સ્ટોર": ["જનરલ", "general"]
  };

  return (map[activeCategory] || [])
    .some(word => text.includes(word));
}

/* દુકાનો બતાવવી */

function renderShops() {
  shopList.replaceChildren();

  const visible = shops.filter(shop => {
    const text =
      `${shop.name || ""} ${shop.area || ""} ${shop.category || ""}`
        .toLowerCase();

    return (
      text.includes(searchText) &&
      matchesShopCategory(shop)
    );
  });

  if (!visible.length) {
    shopList.textContent =
      "આ શોધમાં કોઈ ચાલુ દુકાન મળી નથી.";
    return;
  }

  visible.forEach(shop => {
    const card = document.createElement("article");

    card.className = "shop-card";

    const photo = getPhoto(shop);

    card.append(
      photo
        ? makeImage(photo, shop.name, "shop-photo")
        : makePlaceholder("🏪", "shop-photo")
    );

    const info = document.createElement("div");

    info.className = "shop-info";

    const title = document.createElement("h3");
    title.textContent = shop.name || "દુકાન";

    const category = document.createElement("p");
    category.textContent = shop.category || "દુકાન";

    const area = document.createElement("p");
    area.textContent =
      "📍 " + (shop.area || "વિસ્તાર ઉપલબ્ધ નથી");

    const button = document.createElement("button");

    button.type = "button";
    button.className = "primary-button";
    button.textContent = "દુકાન ખોલો";

    button.addEventListener("click", () => {
      openShop(shop.id);
    });

    info.append(title, category, area, button);
    card.append(info);

    shopList.append(card);
  });
}

/* વસ્તુ શોધ */

function addProductSearch() {
  if ($("productSearchBox")) {
    return;
  }

  const search = document.createElement("input");

  search.id = "productSearchBox";
  search.className = "search-box";
  search.placeholder = "🔍 વસ્તુ શોધો";

  search.addEventListener("input", () => {
    searchText = search.value.trim().toLowerCase();
    renderProducts();
  });

  const heading = $("selectedShopName");

  if (heading) {
    heading.after(search);
  }
}

/* દુકાન ખોલવી */

function openShop(id) {
  if (!checkPageTime()) {
    return;
  }

  const shop = shops.find(item => item.id === id);

  if (!shop || !isShopAvailable(shop)) {
    alert("આ દુકાન હાલમાં બંધ છે.");
    return;
  }

  if (!selectedShop || selectedShop.id !== id) {
    cart = {};
  }

  selectedShop = shop;
  searchText = "";
  activeCategory = "બધી વસ્તુઓ";

  $("selectedShopName").textContent =
    shop.name || "દુકાન";

  productsSection.hidden = false;
  $("shopsSection").hidden = true;

  addProductSearch();

  const search = $("productSearchBox");

  if (search) {
    search.value = "";
  }

  renderProducts();
  renderCart();

  productsSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

/* વસ્તુઓ બતાવવી */

function renderProducts() {
  productList.replaceChildren();

  if (!selectedShop) {
    return;
  }

  const visible = products.filter(product => {
    const matchesShop =
      product.shopId === selectedShop.id;

    const isApproved =
      product.approved === true;

    const isActive =
      product.active !== false;

    const matchesSearch =
      String(product.name || "")
        .toLowerCase()
        .includes(searchText);

    return (
      matchesShop &&
      isApproved &&
      isActive &&
      matchesSearch
    );
  });

  if (!visible.length) {
    productList.textContent =
      "આ દુકાનમાં હાલમાં કોઈ વસ્તુ ઉપલબ્ધ નથી.";
    return;
  }

  visible.forEach(product => {
    const card = document.createElement("article");

    card.className = "product-card";

    const photo = getPhoto(product);

    card.append(
      photo
        ? makeImage(photo, product.name, "product-photo")
        : makePlaceholder("🛍️", "product-photo")
    );

    const title = document.createElement("h3");
    title.textContent = product.name || "વસ્તુ";

    const price = document.createElement("p");

    price.className = "product-price";
    price.textContent = productPriceLabel(product);

    const quantity = document.createElement("div");

    quantity.className = "quantity-control";

    const minus = document.createElement("button");

    minus.type = "button";
    minus.className = "quantity-button minus";
    minus.textContent = "−";
    minus.setAttribute("aria-label", "જથ્થો ઘટાડો");

    minus.disabled = !cart[product.id];

    minus.addEventListener("click", () => {
      changeQuantity(
        product,
        -quantityStep(product)
      );
    });

    const amount = document.createElement("span");

    amount.className = "quantity-value";

    amount.textContent = cart[product.id]
      ? quantityLabel(product, cart[product.id].quantity)
      : "0";

    const plus = document.createElement("button");

    plus.type = "button";
    plus.className = "quantity-button plus";
    plus.textContent = "+";
    plus.setAttribute("aria-label", "જથ્થો વધારો");

    plus.addEventListener("click", () => {
      changeQuantity(
        product,
        quantityStep(product)
      );
    });

    quantity.append(minus, amount, plus);

    const line = document.createElement("p");

    line.className = "product-line-total";

    line.textContent = cart[product.id]
      ? "કિંમત: ₹" +
        money(itemPrice(product, cart[product.id].quantity))
      : "વસ્તુ પસંદ કરો";

    card.append(title, price, quantity, line);

    productList.append(card);
  });
}

/* જથ્થો વધારવો અથવા ઘટાડવો */

function changeQuantity(product, change) {
  if (!checkPageTime()) {
    return;
  }

  const current =
    cart[product.id]?.quantity || 0;

  const next = current + change;

  if (next <= 0) {
    delete cart[product.id];
  } else {
    cart[product.id] = {
      product,
      quantity: next
    };
  }

  renderProducts();
  renderCart();
}

/* કાર્ટ બતાવવો */

function renderCart() {
  const box = $("cartItems");

  if (!box) {
    return;
  }

  box.replaceChildren();

  const items = Object.values(cart);

  if (!items.length) {
    box.textContent =
      "હજુ કોઈ વસ્તુ પસંદ કરી નથી.";
  } else {
    items.forEach(item => {
      const row = document.createElement("div");

      row.className = "cart-row";

      const name = document.createElement("span");

      name.textContent =
        `${item.product.name} × ${quantityLabel(item.product, item.quantity)}`;

      const price = document.createElement("strong");

      price.textContent =
        "₹" + money(itemPrice(item.product, item.quantity));

      row.append(name, price);
      box.append(row);
    });
  }

  const { total, weight } = getTotals();

  if ($("cartTotal")) {
    $("cartTotal").textContent =
      "₹" + money(total);
  }

  let weightInfo = $("weightInfo");

  if (!weightInfo && $("cartSection")) {
    weightInfo = document.createElement("p");
    weightInfo.id = "weightInfo";
    $("cartSection").append(weightInfo);
  }

  if (weightInfo) {
    weightInfo.textContent = weight > 0
      ? "કુલ વજન: " +
        (weight >= 1000
          ? money(weight / 1000) + " કિલો"
          : money(weight) + " ગ્રામ")
      : "";
  }

  let minimumInfo = $("minimumInfo");

  if (!minimumInfo && $("cartSection")) {
    minimumInfo = document.createElement("p");
    minimumInfo.id = "minimumInfo";
    minimumInfo.className = "minimum-info";
    $("cartSection").append(minimumInfo);
  }

  const status = getMinimumStatus();

  if (minimumInfo) {
    minimumInfo.textContent = status.message;

    minimumInfo.className =
      status.allowed
        ? "minimum-info allowed"
        : "minimum-info not-allowed";
  }

  if (orderButton) {
    orderButton.disabled =
      !status.allowed ||
      sending ||
      !isOrderTimeAllowed();
  }
}

/* મેસેજ */

function showOrderMessage(message, isError = false) {
  if (!orderMessage) {
    alert(message);
    return;
  }

  orderMessage.textContent = message;

  orderMessage.className =
    isError
      ? "message-error"
      : "message-success";
}

/* WhatsApp નંબર */

function getWhatsappNumber(shop) {
  const digits =
    String(shop?.whatsapp || "").replace(/\D/g, "");

  if (!/^[6-9][0-9]{9}$/.test(digits)) {
    return null;
  }

  return "91" + digits;
}

/* WhatsApp ઓર્ડર મેસેજ */

function createOrderMessage(customer, shop, total) {
  let message =
    `નમસ્તે ${shop.name},\nમારે ઓર્ડર આપવો છે.\n\n`;

  message +=
    `ગ્રાહકનું નામ: ${customer.name}\n`;

  message +=
    `મોબાઇલ નંબર: ${customer.mobile}\n`;

  message +=
    `સરનામું: ${customer.address}\n\n`;

  message += "ઓર્ડરની વસ્તુઓ:\n";

  Object.values(cart).forEach((item, index) => {
    message +=
      `${index + 1}. ${item.product.name} × ${quantityLabel(item.product, item.quantity)} = ₹${money(itemPrice(item.product, item.quantity))}\n`;
  });

  message +=
    `\nકુલ બિલ: ₹${money(total)}\n`;

  message +=
    "\nકૃપા કરીને ઓર્ડરની પુષ્ટિ કરો.";

  return message;
}

/* ઓર્ડર મોકલવો */

if (orderForm) {
  orderForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (sending) {
      return;
    }

    if (!checkPageTime()) {
      return;
    }

    const status = getMinimumStatus();

    if (!status.allowed) {
      showOrderMessage(status.message, true);
      return;
    }

    if (!selectedShop || !isShopAvailable(selectedShop)) {
      showOrderMessage(
        "દુકાન હાલમાં ઉપલબ્ધ નથી.",
        true
      );
      return;
    }

    const whatsapp =
      getWhatsappNumber(selectedShop);

    if (!whatsapp) {
      showOrderMessage(
        "આ દુકાનનો સાચો WhatsApp નંબર ઉપલબ્ધ નથી.",
        true
      );
      return;
    }

    const name =
      $("customerName")?.value.trim() || "";

    const mobile =
      $("customerMobile")?.value.trim() || "";

    const address =
      $("customerAddress")?.value.trim() || "";

    if (
      !name ||
      !/^[6-9][0-9]{9}$/.test(mobile) ||
      !address
    ) {
      showOrderMessage(
        "નામ, સાચો 10 અંકનો મોબાઇલ નંબર અને પૂરું સરનામું ભરો.",
        true
      );
      return;
    }

    const { total } = getTotals();

    const orderItems = Object.values(cart).map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      unit: item.product.unit || "",
      displayQuantity: quantityLabel(
        item.product,
        item.quantity
      ),
      price: Number(item.product.price || 0),
      itemTotal: Number(
        itemPrice(item.product, item.quantity).toFixed(2)
      )
    }));

    const customer = {
      name,
      mobile,
      address
    };

    const message = createOrderMessage(
      customer,
      selectedShop,
      total
    );

    const whatsappUrl =
      `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;

    sending = true;

    if (orderButton) {
      orderButton.disabled = true;
      orderButton.textContent =
        "ઓર્ડર સાચવાઈ રહ્યો છે...";
    }

    try {
      await addDoc(collection(db, "orders"), {
        shopId: selectedShop.id,
        shopName: selectedShop.name,
        sellerWhatsapp: selectedShop.whatsapp,
        customerName: name,
        customerMobile: mobile,
        customerAddress: address,
        items: orderItems,
        total: Number(total.toFixed(2)),
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
      sending = false;

      if (orderButton) {
        orderButton.textContent =
          "WhatsApp પર ઓર્ડર મોકલો";
      }

      renderCart();
    }
  });
}

/* દુકાનોમાં પાછા જવું */

function goBackToShops() {
  cart = {};
  selectedShop = null;

  if (productsSection) {
    productsSection.hidden = true;
  }

  if ($("shopsSection")) {
    $("shopsSection").hidden = false;
  }

  renderCart();

  if (shopList) {
    shopList.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

if (backButton) {
  backButton.addEventListener(
    "click",
    goBackToShops
  );
}

/* Firebaseમાંથી ડેટા લોડ કરવો */

async function loadData() {
  if (shopList) {
    shopList.textContent =
      "દુકાનો લોડ થઈ રહી છે...";
  }

  if (productList) {
    productList.textContent =
      "વસ્તુઓ લોડ થઈ રહી છે...";
  }

  try {
    const [
      shopSnapshot,
      productSnapshot
    ] = await Promise.all([
      getDocs(
        query(
          collection(db, "shops"),
          where("approved", "==", true)
        )
      ),

      getDocs(
        query(
          collection(db, "products"),
          where("approved", "==", true)
        )
      )
    ]);

    shops = shopSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(isShopAvailable);

    products = productSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    renderShops();
    renderCart();

    if (!shops.length && shopList) {
      shopList.textContent =
        "હાલમાં કોઈ ચાલુ દુકાન ઉપલબ્ધ નથી.";
    }

  } catch (error) {
    console.error(error);

    if (shopList) {
      shopList.textContent =
        "ડેટા લોડ કરવામાં ભૂલ: " + error.message;
    }
  }
}

/* શરૂઆત */

if (checkPageTime()) {
  addShopTools();
  loadData();
  renderCart();
}
