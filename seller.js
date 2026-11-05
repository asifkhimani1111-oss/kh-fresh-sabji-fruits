
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

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || demoData;
  } catch (error) {
    return demoData;
  }
}

function saveData() {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function safeText(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

let data = loadData();

const shopForm = document.getElementById("shopForm");
const productForm = document.getElementById("productForm");

function refreshSeller() {
  const shopSelect = document.getElementById("myShop");
  const sellerShops = document.getElementById("sellerShops");

  shopSelect.innerHTML = "";

  data.shops.forEach(shop => {
    const option = document.createElement("option");
    option.value = shop.id;
    option.textContent = shop.name;
    shopSelect.appendChild(option);
  });

  sellerShops.innerHTML = "";

  if (data.shops.length === 0) {
    sellerShops.textContent = "હજી કોઈ દુકાન નથી.";
    return;
  }

  data.shops.forEach(shop => {
    const div = document.createElement("div");
    div.innerHTML = `
      <hr>
      <b>${safeText(shop.name)}</b>
      <p>${shop.approved ? "મંજૂર" : "Admin મંજૂરી બાકી"}</p>
      <p>વસ્તુઓ: ${(shop.products || []).length}</p>
    `;
    sellerShops.appendChild(div);
  });
}

shopForm.addEventListener("submit", function(event) {
  event.preventDefault();

  const shop = {
    id: "shop-" + Date.now(),
    name: document.getElementById("shopName").value.trim(),
    category: document.getElementById("shopCategory").value.trim(),
    area: document.getElementById("shopArea").value.trim(),
    rule: document.getElementById("shopRule").value,
    approved: false,
    products: []
  };

  data.shops.push(shop);
  saveData();
  shopForm.reset();
  refreshSeller();

  alert("દુકાન ઉમેરાઈ. Admin ની મંજૂરી બાકી છે.");
});

productForm.addEventListener("submit", function(event) {
  event.preventDefault();

  const shopId = document.getElementById("myShop").value;
  const shop = data.shops.find(item => item.id === shopId);

  if (!shop) {
    alert("પહેલાં દુકાન ઉમેરો.");
    return;
  }

  const name = document.getElementById("productName").value.trim();
  const price = Number(document.getElementById("productPrice").value);
  const unit = document.getElementById("productUnit").value.trim();

  if (!name || !unit || !Number.isFinite(price) || price < 0) {
    alert("યોગ્ય માહિતી ભરો.");
    return;
  }

  shop.products.push({
    id: "product-" + Date.now(),
    name: name,
    price: price,
    unit: unit
  });

  saveData();
  productForm.reset();
  refreshSeller();

  alert("વસ્તુ ઉમેરાઈ ગઈ.");
});

refreshSeller();
