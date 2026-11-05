
const STORAGE_KEY = "kh_fresh_fashion_data";

const demoData = {
  shops: [
    {
      id: "shop_demo",
      name: "K.H Fresh Sabji & Fruits",
      category: "ફળ અને શાકભાજી",
      area: "Gadhada",
      rule: "veg2kg",
      approved: true,
      image: ""
    }
  ],
  products: [
    {
      id: "product_1",
      shopId: "shop_demo",
      name: "બટાકા",
      price: 40,
      unit: "kg",
      image: ""
    },
    {
      id: "product_2",
      shopId: "shop_demo",
      name: "ડુંગળી",
      price: 50,
      unit: "kg",
      image: ""
    },
    {
      id: "product_3",
      shopId: "shop_demo",
      name: "કેળા",
      price: 60,
      unit: "kg",
      image: ""
    }
  ]
};

function getData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoData));
      return JSON.parse(JSON.stringify(demoData));
    }

    const data = JSON.parse(saved);

    if (!Array.isArray(data.shops)) data.shops = [];
    if (!Array.isArray(data.products)) data.products = [];

    return data;
  } catch (error) {
    console.error("Data error:", error);
    return JSON.parse(JSON.stringify(demoData));
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (char) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
  });
}

function renderAdmin() {
  const data = getData();

  const pendingArea = document.getElementById("pendingShops");
  const allArea = document.getElementById("allShops");

  if (!pendingArea || !allArea) return;

  const pending = data.shops.filter(shop => !shop.approved);

  pendingArea.innerHTML = pending.length
    ? pending.map(shop => `
      <div class="shop-card">
        <h3>${safeText(shop.name)}</h3>
        <p>કેટેગરી: ${safeText(shop.category)}</p>
        <p>વિસ્તાર: ${safeText(shop.area)}</p>
        <span class="status pending">મંજૂરી બાકી</span>
        <br>
        <button class="approve-btn" onclick="approveShop('${safeText(shop.id)}')">
          મંજૂરી આપો
        </button>
        <button class="delete-btn" onclick="deleteShop('${safeText(shop.id)}')">
          ડિલીટ કરો
        </button>
      </div>
    `).join("")
    : "<p>કોઈ દુકાનની મંજૂરી બાકી નથી.</p>";

  allArea.innerHTML = data.shops.length
    ? data.shops.map(shop => `
      <div class="shop-card">
        <h3>${safeText(shop.name)}</h3>
        <p>કેટેગરી: ${safeText(shop.category)}</p>
        <p>વિસ્તાર: ${safeText(shop.area)}</p>
        <p>નિયમ: ${getRuleName(shop.rule)}</p>
        <span class="status ${shop.approved ? "approved" : "pending"}">
          ${shop.approved ? "મંજૂર" : "મંજૂરી બાકી"}
        </span>
        <br>
        ${shop.approved
          ? `<button onclick="changeShopStatus('${safeText(shop.id)}', false)">બંધ કરો</button>`
          : `<button class="approve-btn" onclick="approveShop('${safeText(shop.id)}')">મંજૂરી આપો</button>`
        }
        <button class="delete-btn" onclick="deleteShop('${safeText(shop.id)}')">
          ડિલીટ કરો
        </button>
      </div>
    `).join("")
    : "<p>હજુ કોઈ દુકાન ઉમેરાઈ નથી.</p>";
}

function getRuleName(rule) {
  const rules = {
    veg2kg: "ઓછામાં ઓછું 2 કિલો",
    amount500: "ઓછામાં ઓછા ₹500",
    none: "કોઈ મિનિમમ નથી",
    custom: "કસ્ટમ નિયમ"
  };

  return rules[rule] || "નિયમ નક્કી નથી";
}

function approveShop(shopId) {
  const data = getData();
  const shop = data.shops.find(item => item.id === shopId);

  if (!shop) return;

  shop.approved = true;
  saveData(data);
  renderAdmin();
  alert("દુકાનને મંજૂરી મળી ગઈ.");
}

function changeShopStatus(shopId, status) {
  const data = getData();
  const shop = data.shops.find(item => item.id === shopId);

  if (!shop) return;

  shop.approved = status;
  saveData(data);
  renderAdmin();
}

function deleteShop(shopId) {
  if (!confirm("શું તમે આ દુકાન અને તેના બધા પ્રોડક્ટ ડિલીટ કરવા માંગો છો?")) {
    return;
  }

  const data = getData();

  data.shops = data.shops.filter(shop => shop.id !== shopId);
  data.products = data.products.filter(product => product.shopId !== shopId);

  saveData(data);
  renderAdmin();

  alert("દુકાન ડિલીટ થઈ ગઈ.");
}

document.addEventListener("DOMContentLoaded", renderAdmin);
