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
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// તમારા Adminનું Firebase UID
const ADMIN_UID = "uFXdUEzRvaOYQ5IwGio6GRDzgSG";

// HTML elements
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

// HTML સુરક્ષા માટે
function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// Login
adminLoginForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  adminMessage.textContent = "લોગિન થઈ રહ્યું છે...";

  try {
    const email = adminEmail.value.trim();
    const password = adminPassword.value;

    await signInWithEmailAndPassword(auth, email, password);

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

  // UID દ્વારા Admin ઓળખ
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

    const products = productSnapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    showPendingShops(shops.filter(shop => shop.approved !== true));
    showAllShops(shops);

    showPendingProducts(
      products.filter(product => product.approved !== true)
    );

    showAllProducts(products, shops);

  } catch (error) {
    const message = "ડેટા લોડ કરવામાં ભૂલ: " + safeText(error.message);

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

// બધી Shops
function showAllShops(shops) {

  if (!shops.length) {
    allShops.textContent = "હજુ કોઈ Shop નથી.";
    return;
  }

  allShops.innerHTML = shops.map(shop => `
    <div class="admin-card">
      <h3>${safeText(shop.name)}</h3>
      <p>વિસ્તાર: ${safeText(shop.area)}</p>
      <p>કેટેગરી: ${safeText(shop.category)}</p>
      <p>સ્થિતિ:
        ${shop.approved === true ? "મંજૂર" : "મંજૂરી બાકી"}
      </p>

      ${shop.approved !== true ? `
        <button data-action="approve-shop"
          data-id="${safeText(shop.id)}">
          મંજૂરી આપો
        </button>
      ` : ""}

      <button data-action="delete-shop"
        data-id="${safeText(shop.id)}">
        Delete
      </button>
    </div>
  `).join("");
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