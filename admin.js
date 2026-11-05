
import { auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const ADMIN_UID = "uFXdUEzRvaOYQ5IwGio6GRDzgSG2";

const adminLogin = document.getElementById("adminLogin");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const adminMessage = document.getElementById("adminMessage");

const adminDashboard = document.getElementById("adminDashboard");
const adminWelcome = document.getElementById("adminWelcome");
const adminLogout = document.getElementById("adminLogout");

const pending = document.getElementById("pending");
const allShops = document.getElementById("allShops");
const pendingProducts = document.getElementById("pendingProducts");
const allProducts = document.getElementById("allProducts");

let currentAdmin = false;
let allProductsData = [];

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function getProductCount(shopId) {
  return allProductsData.filter(product =>
    product.shopId === shopId
  ).length;
}

function getMonthlyFee(productCount) {
  const blocks = Math.max(1, Math.ceil(productCount / 30));
  return blocks * 60;
}

function getExpiryDate(shop) {
  if (!shop.activeUntil) return null;

  if (typeof shop.activeUntil.toDate === "function") {
    return shop.activeUntil.toDate();
  }

  const date = new Date(shop.activeUntil);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
  if (!date) return "તારીખ ઉપલબ્ધ નથી";

  return date.toLocaleDateString("gu-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

// Login
adminLoginForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  adminMessage.textContent = "લોગિન થઈ રહ્યું છે...";

  try {
    await signInWithEmailAndPassword(
      auth,
      adminEmail.value.trim(),
      adminPassword.value
    );
  } catch (error) {
    adminMessage.textContent = "લોગિન નિષ્ફળ: " + error.message;
  }
});

// Auth check
onAuthStateChanged(auth, async function(user) {
  currentAdmin = false;

  if (!user) {
    adminLogin.hidden = false;
    adminDashboard.hidden = true;
    adminMessage.textContent = "";
    return;
  }

  if (user.uid !== ADMIN_UID) {
    adminLogin.hidden = false;
    adminDashboard.hidden = true;
    adminMessage.textContent =
      "આ એકાઉન્ટને Adminની પરવાનગી નથી.";
    return;
  }

  currentAdmin = true;
  adminLogin.hidden = true;
  adminDashboard.hidden = false;

  adminWelcome.textContent =
    "સ્વાગત છે, " + (user.email || "Admin");

  await loadAdminData();
});

// Logout
adminLogout.addEventListener("click", async function() {
  await signOut(auth);
});

// Expired shops OFF કરો
async function turnExpiredShopsOff(shops) {
  const now = new Date();

  for (const shop of shops) {
    const expiry = getExpiryDate(shop);

    if (
      shop.active === true &&
      expiry &&
      expiry <= now
    ) {
      await updateDoc(doc(db, "shops", shop.id), {
        active: false
      });

      shop.active = false;
    }
  }
}

// બધા ડેટા લોડ કરો
async function loadAdminData() {
  if (!currentAdmin) return;

  pending.textContent = "લોડ થઈ રહ્યું છે...";
  allShops.textContent = "લોડ થઈ રહ્યું છે...";
  pendingProducts.textContent = "લોડ થઈ રહ્યું છે...";
  allProducts.textContent = "લોડ થઈ રહ્યું છે...";

  try {
    const shopSnapshot = await getDocs(collection(db, "shops"));
    const productSnapshot = await getDocs(collection(db, "products"));

    const shops = shopSnapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    allProductsData = productSnapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    await turnExpiredShopsOff(shops);

    showPendingShops(
      shops.filter(shop => shop.approved !== true)
    );

    showAllShops(shops);

    showPendingProducts(
      allProductsData.filter(product => product.approved !== true)
    );

    showAllProducts(allProductsData, shops);

  } catch (error) {
    const message =
      "ડેટા લોડ કરવામાં ભૂલ: " + safeText(error.message);

    pending.innerHTML = message;
    allShops.innerHTML = message;
    pendingProducts.innerHTML = message;
    allProducts.innerHTML = message;
  }
}

// Pending Shops
function showPendingShops(shops) {
  if (!shops.length) {
    pending.textContent = "કોઈ નવી Shop મંજૂરી માટે નથી.";
    return;
  }

  pending.innerHTML = shops.map(shop => `
    <div class="admin-card">
      <h3>${safeText(shop.name)}</h3>
      <p>કેટેગરી: ${safeText(shop.category)}</p>
      <p>વિસ્તાર: ${safeText(shop.area)}</p>
      <p>નિયમ: ${safeText(shop.rule)}</p>

      <button data-action="approve-shop"
        data-id="${safeText(shop.id)}">
        મંજૂરી આપો
      </button>

      <button data-action="delete-shop"
        data-id="${safeText(shop.id)}">
        Delete
      </button>
    </div>
  `).join("");
}

// બધી Shops અને ફી વ્યવસ્થા
function showAllShops(shops) {
  if (!shops.length) {
    allShops.textContent = "હજુ કોઈ Shop નથી.";
    return;
  }

  allShops.innerHTML = shops.map(shop => {
    const count = getProductCount(shop.id);
    const monthlyFee = getMonthlyFee(count);
    const expiry = getExpiryDate(shop);

    const isActive =
      shop.active === true &&
      expiry &&
      expiry > new Date();

    const status = isActive ? "ચાલુ છે" : "બંધ છે";

    const firstPaymentDone =
      shop.firstPaymentDone === true;

    const nextFee = firstPaymentDone
      ? monthlyFee
      : 300;

    return `
      <div class="admin-card">
        <h3>${safeText(shop.name)}</h3>

        <p>વિસ્તાર: ${safeText(shop.area)}</p>
        <p>કેટેગરી: ${safeText(shop.category)}</p>

        <p>મંજૂરી:
          ${shop.approved === true ? "મંજૂર" : "મંજૂરી બાકી"}
        </p>

        <p>પ્રોડક્ટની સંખ્યા: ${count}</p>

        <p>દુકાનની સ્થિતિ:
          <strong>${status}</strong>
        </p>

        <p>ફી:
          ${firstPaymentDone
            ? "આગામી મહિને ₹" + monthlyFee
            : "પહેલી વખત ₹300 (પહેલો મહિનો સામેલ)"}
        </p>

        <p>દુકાન ચાલુ રહેવાની છેલ્લી તારીખ:
          ${formatDate(expiry)}
        </p>

        ${shop.approved !== true ? `
          <button data-action="approve-shop"
            data-id="${safeText(shop.id)}">
            મંજૂરી આપો
          </button>
        ` : ""}

        ${isActive ? `
          <button data-action="deactivate-shop"
            data-id="${safeText(shop.id)}">
            દુકાન OFF કરો
          </button>
        ` : `
          <button data-action="activate-shop"
            data-id="${safeText(shop.id)}">
            ₹${nextFee} રોકડા મળ્યા - ON કરો
          </button>
        `}

        <button data-action="delete-shop"
          data-id="${safeText(shop.id)}">
          Delete
        </button>
      </div>
    `;
  }).join("");
}

// Pending Products
function showPendingProducts(products) {
  if (!products.length) {
    pendingProducts.textContent =
      "કોઈ Product મંજૂરી માટે બાકી નથી.";
    return;
  }

  pendingProducts.innerHTML = products.map(product => `
    <div class="admin-card">
      <h3>${safeText(product.name)}</h3>
      <p>કિંમત: ₹${safeText(product.price)}</p>
      <p>યુનિટ: ${safeText(product.unit)}</p>

      <button data-action="approve-product"
        data-id="${safeText(product.id)}">
        મંજૂરી આપો
      </button>

      <button data-action="delete-product"
        data-id="${safeText(product.id)}">
        Delete
      </button>
    </div>
  `).join("");
}

// બધા Products
function showAllProducts(products, shops) {
  if (!products.length) {
    allProducts.textContent = "હજુ કોઈ Product નથી.";
    return;
  }

  allProducts.innerHTML = products.map(product => {
    const shop = shops.find(item => item.id === product.shopId);
    const shopName = shop ? shop.name : "Shop મળી નથી";

    return `
      <div class="admin-card">
        <h3>${safeText(product.name)}</h3>
        <p>Shop: ${safeText(shopName)}</p>
        <p>કિંમત: ₹${safeText(product.price)}</p>
        <p>યુનિટ: ${safeText(product.unit)}</p>

        <p>સ્થિતિ:
          ${product.approved === true ? "મંજૂર" : "મંજૂરી બાકી"}
        </p>

        ${product.approved !== true ? `
          <button data-action="approve-product"
            data-id="${safeText(product.id)}">
            મંજૂરી આપો
          </button>
        ` : ""}

        <button data-action="delete-product"
          data-id="${safeText(product.id)}">
          Delete
        </button>
      </div>
    `;
  }).join("");
}

// Admin actions
document.addEventListener("click", async function(event) {
  const button = event.target.closest("button[data-action]");

  if (!button || !currentAdmin) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  if (!id) return;

  try {
    button.disabled = true;

    if (action === "approve-shop") {
      await updateDoc(doc(db, "shops", id), {
        approved: true
      });
    }

    else if (action === "approve-product") {
      await updateDoc(doc(db, "products", id), {
        approved: true
      });
    }

    else if (action === "activate-shop") {
      const shopSnapshot = await getDocs(collection(db, "shops"));
      const productSnapshot = await getDocs(collection(db, "products"));

      const shopDoc = shopSnapshot.docs.find(item => item.id === id);

      if (!shopDoc) {
        throw new Error("દુકાન મળી નથી.");
      }

      const shop = shopDoc.data();

      if (shop.approved !== true) {
        alert("પહેલા દુકાનને મંજૂરી આપો.");
        button.disabled = false;
        return;
      }

      const productCount = productSnapshot.docs.filter(item =>
        item.data().shopId === id
      ).length;

      const firstPaymentDone =
        shop.firstPaymentDone === true;

      const amount = firstPaymentDone
        ? getMonthlyFee(productCount)
        : 300;

      const message = firstPaymentDone
        ? `દુકાનના ${productCount} પ્રોડક્ટ છે.\nઆ મહિના માટે ₹${amount} રોકડા મળ્યા છે?`
        : "પહેલી વખત ₹300 રોકડા મળ્યા છે?\nઆ રકમમાં પહેલો મહિનો સામેલ છે.";

      if (!confirm(message)) {
        button.disabled = false;
        return;
      }

      const now = new Date();
      const oldExpiry = getExpiryDate(shop);

      const startDate =
        oldExpiry && oldExpiry > now ? oldExpiry : now;

      const expiryDate = new Date(startDate);
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      await updateDoc(doc(db, "shops", id), {
        active: true,
        firstPaymentDone: true,
        activeUntil: Timestamp.fromDate(expiryDate),
        lastCashAmount: amount,
        lastCashAt: Timestamp.now()
      });

      alert(
        "દુકાન ON થઈ ગઈ છે.\nફી: ₹" + amount +
        "\nચાલુ રહેવાની છેલ્લી તારીખ: " +
        formatDate(expiryDate)
      );
    }

    else if (action === "deactivate-shop") {
      if (!confirm("શું આ દુકાન તરત OFF કરવી છે?")) {
        button.disabled = false;
        return;
      }

      await updateDoc(doc(db, "shops", id), {
        active: false
      });
    }

    else if (action === "delete-shop") {
      if (!confirm("આ Shop Delete કરવી છે?")) {
        button.disabled = false;
        return;
      }

      await deleteDoc(doc(db, "shops", id));
    }

    else if (action === "delete-product") {
      if (!confirm("આ Product Delete કરવો છે?")) {
        button.disabled = false;
        return;
      }

      await deleteDoc(doc(db, "products", id));
    }

    await loadAdminData();

  } catch (error) {
    alert("કામ પૂર્ણ થયું નથી: " + error.message);
    button.disabled = false;
  }
});
