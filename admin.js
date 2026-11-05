
import { auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// =====================================
// K.H FRESH & FASHION - ADMIN SYSTEM
// =====================================

const ADMIN_UID = "uFXdUEzRvaOYQ5IwGio6GRDzgSG";

const $ = id => document.getElementById(id);

let shops = [];
let products = [];
let categories = [];
let orders = [];
let sellers = [];

let currentAdmin = null;

// =====================================
// COMMON FUNCTIONS
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

function notify(message) {
  const box = $("adminNotification");

  box.textContent = message;
  box.classList.remove("hidden");

  setTimeout(() => {
    box.classList.add("hidden");
  }, 3000);
}

function showLogin() {
  $("loginSection").classList.remove("hidden");
  $("dashboardSection").classList.add("hidden");
}

function showDashboard() {
  $("loginSection").classList.add("hidden");
  $("dashboardSection").classList.remove("hidden");
}

// =====================================
// ADMIN AUTHENTICATION
// =====================================

$("adminLogin").addEventListener("click", async () => {
  const email = $("adminEmail").value.trim();
  const password = $("adminPassword").value;

  if (!email || !password) {
    $("loginMessage").textContent =
      "Email અને Password લખો.";
    return;
  }

  $("adminLogin").disabled = true;
  $("loginMessage").textContent = "Login થઈ રહ્યું છે...";

  try {
    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    if (result.user.uid !== ADMIN_UID) {
      await signOut(auth);

      $("loginMessage").textContent =
        "આ એકાઉન્ટને Admin પરવાનગી નથી.";

      return;
    }

    $("loginMessage").textContent = "";

  } catch (error) {
    console.error(error);

    $("loginMessage").textContent =
      "Login નિષ્ફળ. Email અને Password તપાસો.";
  } finally {
    $("adminLogin").disabled = false;
  }
});

$("adminLogout").addEventListener("click", async () => {
  await signOut(auth);
  notify("Logout થઈ ગયું.");
});

onAuthStateChanged(auth, async user => {
  if (user && user.uid === ADMIN_UID) {
    currentAdmin = user;
    showDashboard();
    await loadDashboard();
  } else {
    currentAdmin = null;
    showLogin();
  }
});

// =====================================
// DASHBOARD DATA
// =====================================

async function loadDashboard() {
  if (!currentAdmin) return;

  try {
    const results = await Promise.all([
      getDocs(collection(db, "shops")),
      getDocs(collection(db, "products")),
      getDocs(collection(db, "categories")),
      getDocs(collection(db, "orders")),
      getDocs(collection(db, "users"))
    ]);

    shops = results[0].docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    products = results[1].docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    categories = results[2].docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    orders = results[3].docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    sellers = results[4].docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    renderAll();

  } catch (error) {
    console.error("Dashboard Error:", error);
    notify("ડેટા લોડ થઈ શક્યો નથી. Firebase Rules તપાસો.");
  }
}

function renderAll() {
  $("totalShops").textContent = shops.length;
  $("totalProducts").textContent = products.length;
  $("totalOrders").textContent = orders.length;
  $("totalSellers").textContent = sellers.length;

  renderShops();
  renderProducts();
  renderCategories();
  renderOrders();
  renderSellers();
  renderShopOptions();
}

// =====================================
// TAB SYSTEM
// =====================================

document.querySelectorAll(".tab-btn").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b =>
      b.classList.remove("active")
    );

    document.querySelectorAll(".tab-content").forEach(tab =>
      tab.classList.add("hidden")
    );

    button.classList.add("active");

    $(button.dataset.tab).classList.remove("hidden");
  });
});

// =====================================
// SHOP MANAGEMENT
// =====================================

$("saveShop").addEventListener("click", saveShop);

async function saveShop() {
  if (!currentAdmin) return;

  const editId = $("shopEditId").value;

  const name = $("shopName").value.trim();
  const ownerName = $("shopOwner").value.trim();
  const area = $("shopArea").value.trim();
  const phone = $("shopPhone").value.trim();
  const whatsapp = $("shopWhatsapp").value.trim();
  const image = $("shopImage").value.trim();
  const minimumRule = $("shopMinimumRule").value;
  const minimumValue = Number(
    $("shopMinimumValue").value || 0
  );

  const active = $("shopStatus").value === "true";

  if (!name || !area) {
    notify("દુકાનનું નામ અને વિસ્તાર જરૂરી છે.");
    return;
  }

  if (minimumRule === "custom" && minimumValue <= 0) {
    notify("Custom Minimum રકમ લખો.");
    return;
  }

  const data = {
    name,
    shopName: name,
    ownerName,
    area,
    village: area,
    phone,
    whatsapp,
    image,
    minimumRule,
    minimumValue,
    active,
    isActive: active,
    status: active ? "active" : "off",
    updatedAt: serverTimestamp()
  };

  try {
    if (editId) {
      await updateDoc(doc(db, "shops", editId), data);
      notify("દુકાન અપડેટ થઈ ગઈ.");
    } else {
      data.ownerUid = currentAdmin.uid;
      data.createdAt = serverTimestamp();

      await addDoc(collection(db, "shops"), data);
      notify("નવી દુકાન ઉમેરાઈ ગઈ.");
    }

    resetShopForm();
    await loadDashboard();

  } catch (error) {
    console.error(error);
    notify("દુકાન સેવ થઈ શકી નથી.");
  }
}

function renderShops() {
  const box = $("adminShopList");

  if (!shops.length) {
    box.innerHTML = "<p>હજુ કોઈ દુકાન નથી.</p>";
    return;
  }

  box.innerHTML = shops.map(shop => `
    <div class="admin-list-item">
      <h3>${safe(shop.name || shop.shopName)}</h3>

      <p>માલિક: ${safe(shop.ownerName)}</p>
      <p>વિસ્તાર: ${safe(shop.area || shop.village)}</p>
      <p>WhatsApp: ${safe(shop.whatsapp)}</p>
      <p>નિયમ: ${safe(shop.minimumRule || "none")}</p>

      <p>સ્થિતિ:
        <strong>${shop.active === false ? "બંધ" : "ચાલુ"}</strong>
      </p>

      <div class="admin-list-actions">
        <button data-edit-shop="${safe(shop.id)}">
          સુધારો
        </button>

        <button data-toggle-shop="${safe(shop.id)}">
          ${shop.active === false ? "ચાલુ કરો" : "બંધ કરો"}
        </button>

        <button class="delete-btn" data-delete-shop="${safe(shop.id)}">
          Delete
        </button>
      </div>
    </div>
  `).join("");

  box.querySelectorAll("[data-edit-shop]").forEach(button => {
    button.addEventListener("click", () => {
      editShop(button.dataset.editShop);
    });
  });

  box.querySelectorAll("[data-toggle-shop]").forEach(button => {
    button.addEventListener("click", () => {
      toggleShop(button.dataset.toggleShop);
    });
  });

  box.querySelectorAll("[data-delete-shop]").forEach(button => {
    button.addEventListener("click", () => {
      deleteShop(button.dataset.deleteShop);
    });
  });
}

function editShop(id) {
  const shop = shops.find(s => s.id === id);
  if (!shop) return;

  $("shopEditId").value = id;
  $("shopName").value = shop.name || shop.shopName || "";
  $("shopOwner").value = shop.ownerName || "";
  $("shopArea").value = shop.area || shop.village || "";
  $("shopPhone").value = shop.phone || "";
  $("shopWhatsapp").value = shop.whatsapp || "";
  $("shopImage").value = shop.image || "";
  $("shopMinimumRule").value = shop.minimumRule || "none";
  $("shopMinimumValue").value = shop.minimumValue || "";
  $("shopStatus").value = shop.active === false ? "false" : "true";

  $("saveShop").textContent = "દુકાન અપડેટ કરો";
  $("cancelShopEdit").classList.remove("hidden");

  $("shopsTab").scrollIntoView({ behavior: "smooth" });
}

async function toggleShop(id) {
  const shop = shops.find(s => s.id === id);
  if (!shop) return;

  const active = shop.active === false;

  try {
    await updateDoc(doc(db, "shops", id), {
      active,
      isActive: active,
      status: active ? "active" : "off",
      updatedAt: serverTimestamp()
    });

    notify(active ? "દુકાન ચાલુ થઈ." : "દુકાન બંધ થઈ.");

    await loadDashboard();

  } catch (error) {
    console.error(error);
    notify("દુકાનની સ્થિતિ બદલી શકાઈ નથી.");
  }
}

async function deleteShop(id) {
  if (!confirm("શું ખરેખર આ દુકાન અને તેની બધી પ્રોડક્ટ્સ Delete કરવી છે?")) {
    return;
  }

  try {
    const shopProducts = products.filter(p => p.shopId === id);

    for (const product of shopProducts) {
      await deleteDoc(doc(db, "products", product.id));
    }

    await deleteDoc(doc(db, "shops", id));

    notify("દુકાન અને તેની પ્રોડક્ટ્સ Delete થઈ ગઈ.");

    resetShopForm();
    await loadDashboard();

  } catch (error) {
    console.error(error);
    notify("દુકાન Delete થઈ શકી નથી.");
  }
}

function resetShopForm() {
  $("shopEditId").value = "";
  $("shopName").value = "";
  $("shopOwner").value = "";
  $("shopArea").value = "";
  $("shopPhone").value = "";
  $("shopWhatsapp").value = "";
  $("shopImage").value = "";
  $("shopMinimumRule").value = "none";
  $("shopMinimumValue").value = "";
  $("shopStatus").value = "true";

  $("saveShop").textContent = "દુકાન સેવ કરો";
  $("cancelShopEdit").classList.add("hidden");
}

$("cancelShopEdit").addEventListener("click", resetShopForm);

// =====================================
// PRODUCT MANAGEMENT
// =====================================

$("saveProduct").addEventListener("click", saveProduct);

async function saveProduct() {
  if (!currentAdmin) return;

  const editId = $("productEditId").value;
  const shopId = $("productShop").value;
  const name = $("productName").value.trim();
  const category = $("productCategory").value.trim();
  const price = Number($("productPrice").value);
  const unit = $("productUnit").value.trim();
  const image = $("productImage").value.trim();
  const active = $("productStatus").value === "true";

  if (!shopId || !name || !category || !unit) {
    notify("બધી જરૂરી માહિતી ભરો.");
    return;
  }

  if (!Number.isFinite(price) || price <= 0) {
    notify("યોગ્ય પ્રોડક્ટ ભાવ લખો.");
    return;
  }

  const data = {
    shopId,
    name,
    title: name,
    category,
    price,
    unit,
    image,
    active,
    isActive: active,
    status: active ? "active" : "off",
    updatedAt: serverTimestamp()
  };

  try {
    if (editId) {
      await updateDoc(doc(db, "products", editId), data);
      notify("પ્રોડક્ટ અપડેટ થઈ ગઈ.");
    } else {
      data.createdAt = serverTimestamp();

      await addDoc(collection(db, "products"), data);
      notify("નવી પ્રોડક્ટ ઉમેરાઈ ગઈ.");
    }

    resetProductForm();
    await loadDashboard();

  } catch (error) {
    console.error(error);
    notify("પ્રોડક્ટ સેવ થઈ શકી નથી.");
  }
}

function renderShopOptions() {
  $("productShop").innerHTML =
    '<option value="">દુકાન પસંદ કરો</option>' +
    shops.map(shop => `
      <option value="${safe(shop.id)}">
        ${safe(shop.name || shop.shopName)}
      </option>
    `).join("");
}

function renderProducts() {
  const box = $("adminProductList");

  if (!products.length) {
    box.innerHTML = "<p>હજુ કોઈ પ્રોડક્ટ નથી.</p>";
    return;
  }

  box.innerHTML = products.map(product => {
    const shop = shops.find(s => s.id === product.shopId);

    return `
      <div class="admin-list-item">
        <h3>${safe(product.name || product.title)}</h3>

        <p>દુકાન: ${safe(shop?.name || "દુકાન મળી નથી")}</p>
        <p>કેટેગરી: ${safe(product.category)}</p>
        <p>ભાવ: ${money(product.price)} / ${safe(product.unit)}</p>

        <p>સ્થિતિ:
          ${product.active === false ? "બંધ" : "ઉપલબ્ધ"}
        </p>

        <div class="admin-list-actions">
          <button data-edit-product="${safe(product.id)}">
            સુધારો
          </button>

          <button data-toggle-product="${safe(product.id)}">
            ${product.active === false ? "ચાલુ કરો" : "બંધ કરો"}
          </button>

          <button class="delete-btn" data-delete-product="${safe(product.id)}">
            Delete
          </button>
        </div>
      </div>
    `;
  }).join("");

  box.querySelectorAll("[data-edit-product]").forEach(button => {
    button.addEventListener("click", () => {
      editProduct(button.dataset.editProduct);
    });
  });

  box.querySelectorAll("[data-toggle-product]").forEach(button => {
    button.addEventListener("click", () => {
      toggleProduct(button.dataset.toggleProduct);
    });
  });

  box.querySelectorAll("[data-delete-product]").forEach(button => {
    button.addEventListener("click", () => {
      deleteProduct(button.dataset.deleteProduct);
    });
  });
}

function editProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  $("productEditId").value = id;
  $("productShop").value = product.shopId;
  $("productName").value = product.name || product.title || "";
  $("productCategory").value = product.category || "";
  $("productPrice").value = product.price || "";
  $("productUnit").value = product.unit || "";
  $("productImage").value = product.image || "";
  $("productStatus").value = product.active === false ? "false" : "true";

  $("saveProduct").textContent = "પ્રોડક્ટ અપડેટ કરો";
  $("cancelProductEdit").classList.remove("hidden");
}

async function toggleProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  const active = product.active === false;

  try {
    await updateDoc(doc(db, "products", id), {
      active,
      isActive: active,
      status: active ? "active" : "off",
      updatedAt: serverTimestamp()
    });

    notify("પ્રોડક્ટની સ્થિતિ બદલાઈ ગઈ.");
    await loadDashboard();

  } catch (error) {
    console.error(error);
    notify("પ્રોડક્ટ અપડેટ થઈ નથી.");
  }
}

async function deleteProduct(id) {
  if (!confirm("શું આ પ્રોડક્ટ Delete કરવી છે?")) return;

  try {
    await deleteDoc(doc(db, "products", id));

    notify("પ્રોડક્ટ Delete થઈ ગઈ.");

    resetProductForm();
    await loadDashboard();

  } catch (error) {
    console.error(error);
    notify("પ્રોડક્ટ Delete થઈ નથી.");
  }
}

function resetProductForm() {
  $("productEditId").value = "";
  $("productShop").value = "";
  $("productName").value = "";
  $("productCategory").value = "";
  $("productPrice").value = "";
  $("productUnit").value = "";
  $("productImage").value = "";
  $("productStatus").value = "true";

  $("saveProduct").textContent = "પ્રોડક્ટ સેવ કરો";
  $("cancelProductEdit").classList.add("hidden");
}

$("cancelProductEdit").addEventListener("click", resetProductForm);

// =====================================
// CATEGORY MANAGEMENT
// =====================================

$("saveCategory").addEventListener("click", async () => {
  const name = $("categoryName").value.trim();

  if (!name) {
    notify("કેટેગરીનું નામ લખો.");
    return;
  }

  if (categories.some(c =>
    String(c.name || "").toLowerCase() === name.toLowerCase()
  )) {
    notify("આ કેટેગરી પહેલેથી છે.");
    return;
  }

  try {
    await addDoc(collection(db, "categories"), {
      name,
      createdAt: serverTimestamp()
    });

    $("categoryName").value = "";

    notify("કેટેગરી ઉમેરાઈ ગઈ.");
    await loadDashboard();

  } catch (error) {
    console.error(error);
    notify("કેટેગરી ઉમેરાઈ નથી.");
  }
});

function renderCategories() {
  const box = $("adminCategoryList");

  if (!categories.length) {
    box.innerHTML = "<p>હજુ કોઈ કેટેગરી નથી.</p>";
    return;
  }

  box.innerHTML = categories.map(category => `
    <div class="admin-list-item">
      <h3>${safe(category.name)}</h3>

      <div class="admin-list-actions">
        <button class="delete-btn"
          data-delete-category="${safe(category.id)}">
          Delete
        </button>
      </div>
    </div>
  `).join("");

  box.querySelectorAll("[data-delete-category]").forEach(button => {
    button.addEventListener("click", async () => {
      if (!confirm("આ કેટેગરી Delete કરવી છે?")) return;

      try {
        await deleteDoc(
          doc(db, "categories", button.dataset.deleteCategory)
        );

        notify("કેટેગરી Delete થઈ ગઈ.");
        await loadDashboard();

      } catch (error) {
        console.error(error);
        notify("કેટેગરી Delete થઈ નથી.");
      }
    });
  });
}

// =====================================
// ORDER MANAGEMENT
// =====================================

function renderOrders() {
  const box = $("adminOrderList");

  if (!orders.length) {
    box.innerHTML = "<p>હજુ કોઈ ઓર્ડર નથી.</p>";
    return;
  }

  box.innerHTML = orders.map(order => `
    <div class="admin-list-item">
      <h3>ઓર્ડર: ${safe(order.orderNumber || order.id)}</h3>

      <p>ગ્રાહક: ${safe(order.customerName)}</p>
      <p>મોબાઇલ: ${safe(order.customerPhone)}</p>
      <p>દુકાન: ${safe(order.shopName)}</p>
      <p>સરનામું: ${safe(order.customerAddress)}</p>
      <p>કુલ: ${money(order.total)}</p>
      <p>સ્થિતિ: ${safe(order.status || "pending")}</p>

      <div class="admin-list-actions">
        <button data-order-status="${safe(order.id)}" data-status="confirmed">
          Confirm
        </button>

        <button data-order-status="${safe(order.id)}" data-status="completed">
          Completed
        </button>

        <button data-order-status="${safe(order.id)}" data-status="cancelled">
          Cancel
        </button>
      </div>
    </div>
  `).join("");

  box.querySelectorAll("[data-order-status]").forEach(button => {
    button.addEventListener("click", async () => {
      try {
        await updateDoc(doc(db, "orders", button.dataset.orderStatus), {
          status: button.dataset.status,
          updatedAt: serverTimestamp()
        });

        notify("ઓર્ડરની સ્થિતિ અપડેટ થઈ.");
        await loadDashboard();

      } catch (error) {
        console.error(error);
        notify("ઓર્ડર અપડેટ થઈ શક્યો નથી.");
      }
    });
  });
}

// =====================================
// SELLER MANAGEMENT
// =====================================

function renderSellers() {
  const box = $("adminSellerList");

  if (!sellers.length) {
    box.innerHTML = "<p>હજુ કોઈ Seller નથી.</p>";
    return;
  }

  box.innerHTML = sellers.map(seller => `
    <div class="admin-list-item">
      <h3>${safe(seller.name || seller.shopName || "Seller")}</h3>

      <p>Email: ${safe(seller.email || "")}</p>
      <p>મોબાઇલ: ${safe(seller.phone || "")}</p>
      <p>Role: ${safe(seller.role || "seller")}</p>
      <p>UID: ${safe(seller.id)}</p>
    </div>
  `).join("");
}

// =====================================
// END ADMIN SYSTEM
// =====================================
