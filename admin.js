
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

import { auth, db } from "./firebase.js";

const loginSection = document.getElementById("adminLogin");
const dashboard = document.getElementById("adminDashboard");
const loginForm = document.getElementById("adminLoginForm");
const message = document.getElementById("adminMessage");
const welcome = document.getElementById("adminWelcome");
const logoutButton = document.getElementById("adminLogout");

const pendingArea = document.getElementById("pending");
const allShopsArea = document.getElementById("allShops");
const pendingProductsArea = document.getElementById("pendingProducts");
const allProductsArea = document.getElementById("allProducts");

let isAdmin = false;

function showMessage(text, error = false) {
  message.textContent = text;
  message.style.color = error ? "red" : "green";
}

function makeButton(label, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", action);
  return button;
}

function makeShopCard(shop) {
  const card = document.createElement("div");
  const heading = document.createElement("h3");
  const category = document.createElement("p");
  const area = document.createElement("p");
  const status = document.createElement("p");

  heading.textContent = shop.name || "નામ નથી";
  category.textContent = "કેટેગરી: " + (shop.category || "");
  area.textContent = "વિસ્તાર: " + (shop.area || "");
  status.textContent = shop.approved
    ? "મંજૂર છે"
    : "મંજૂરી બાકી છે";

  card.append(heading, category, area, status);

  if (!shop.approved) {
    card.appendChild(
      makeButton("દુકાન મંજૂર કરો", () => approveShop(shop.id))
    );
  }

  card.appendChild(
    makeButton("દુકાન ડિલીટ કરો", () => removeShop(shop.id))
  );

  return card;
}

function makeProductCard(product) {
  const card = document.createElement("div");
  const heading = document.createElement("h3");
  const price = document.createElement("p");
  const shop = document.createElement("p");
  const status = document.createElement("p");

  heading.textContent = product.name || "નામ નથી";
  price.textContent =
    "ભાવ: ₹" + product.price + " / " + (product.unit || "");
  shop.textContent = "દુકાન ID: " + (product.shopId || "");
  status.textContent = product.approved
    ? "મંજૂર છે"
    : "મંજૂરી બાકી છે";

  card.append(heading, price, shop, status);

  if (!product.approved) {
    card.appendChild(
      makeButton("વસ્તુ મંજૂર કરો", () => approveProduct(product.id))
    );
  }

  card.appendChild(
    makeButton("વસ્તુ ડિલીટ કરો", () => removeProduct(product.id))
  );

  return card;
}

// બધી દુકાનો અને વસ્તુઓ લાવો
async function loadAdminData() {
  if (!isAdmin) return;

  pendingArea.textContent = "લોડ થઈ રહ્યું છે...";
  allShopsArea.textContent = "લોડ થઈ રહ્યું છે...";
  pendingProductsArea.textContent = "લોડ થઈ રહ્યું છે...";
  allProductsArea.textContent = "લોડ થઈ રહ્યું છે...";

  try {
    const [shopSnapshot, productSnapshot] = await Promise.all([
      getDocs(collection(db, "shops")),
      getDocs(collection(db, "products"))
    ]);

    const shops = shopSnapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    const products = productSnapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    pendingArea.innerHTML = "";
    allShopsArea.innerHTML = "";
    pendingProductsArea.innerHTML = "";
    allProductsArea.innerHTML = "";

    const pendingShops = shops.filter(shop => shop.approved !== true);
    const pendingProducts = products.filter(
      product => product.approved !== true
    );

    if (pendingShops.length === 0) {
      pendingArea.textContent = "કોઈ દુકાનની મંજૂરી બાકી નથી.";
    }

    if (shops.length === 0) {
      allShopsArea.textContent = "હજુ કોઈ દુકાન નથી.";
    }

    if (pendingProducts.length === 0) {
      pendingProductsArea.textContent =
        "કોઈ વસ્તુની મંજૂરી બાકી નથી.";
    }

    if (products.length === 0) {
      allProductsArea.textContent = "હજુ કોઈ વસ્તુ નથી.";
    }

    pendingShops.forEach(shop => {
      pendingArea.appendChild(makeShopCard(shop));
    });

    shops.forEach(shop => {
      allShopsArea.appendChild(makeShopCard(shop));
    });

    pendingProducts.forEach(product => {
      pendingProductsArea.appendChild(makeProductCard(product));
    });

    products.forEach(product => {
      allProductsArea.appendChild(makeProductCard(product));
    });

  } catch (error) {
    const errorText = "ડેટા લોડ થયો નથી: " + error.message;
    pendingArea.textContent = errorText;
    allShopsArea.textContent = errorText;
    pendingProductsArea.textContent = errorText;
    allProductsArea.textContent = errorText;
  }
}

// દુકાન મંજૂર કરો
async function approveShop(id) {
  if (!isAdmin) return;

  if (!confirm("શું આ દુકાન મંજૂર કરવી છે?")) return;

  try {
    await updateDoc(doc(db, "shops", id), {
      approved: true
    });

    alert("દુકાન મંજૂર થઈ ગઈ.");
    await loadAdminData();

  } catch (error) {
    alert("મંજૂરી થઈ નથી: " + error.message);
  }
}

// વસ્તુ મંજૂર કરો
async function approveProduct(id) {
  if (!isAdmin) return;

  if (!confirm("શું આ વસ્તુ મંજૂર કરવી છે?")) return;

  try {
    await updateDoc(doc(db, "products", id), {
      approved: true
    });

    alert("વસ્તુ મંજૂર થઈ ગઈ.");
    await loadAdminData();

  } catch (error) {
    alert("મંજૂરી થઈ નથી: " + error.message);
  }
}

// દુકાન ડિલીટ કરો
async function removeShop(id) {
  if (!isAdmin) return;

  if (!confirm("શું આ દુકાન ડિલીટ કરવી છે?")) return;

  try {
    const productsQuery = await getDocs(collection(db, "products"));

    const relatedProducts = productsQuery.docs.filter(
      item => item.data().shopId === id
    );

    for (const item of relatedProducts) {
      await deleteDoc(doc(db, "products", item.id));
    }

    await deleteDoc(doc(db, "shops", id));

    alert("દુકાન અને તેની વસ્તુઓ ડિલીટ થઈ ગઈ.");
    await loadAdminData();

  } catch (error) {
    alert("ડિલીટ થઈ શક્યું નથી: " + error.message);
  }
}

// વસ્તુ ડિલીટ કરો
async function removeProduct(id) {
  if (!isAdmin) return;

  if (!confirm("શું આ વસ્તુ ડિલીટ કરવી છે?")) return;

  try {
    await deleteDoc(doc(db, "products", id));

    alert("વસ્તુ ડિલીટ થઈ ગઈ.");
    await loadAdminData();

  } catch (error) {
    alert("ડિલીટ થઈ શક્યું નથી: " + error.message);
  }
}

// Admin અધિકાર તપાસો
onAuthStateChanged(auth, async user => {
  if (!user) {
    isAdmin = false;
    loginSection.hidden = false;
    dashboard.hidden = true;
    return;
  }

  try {
    const token = await user.getIdTokenResult(true);

    if (token.claims.admin !== true) {
      isAdmin = false;
      loginSection.hidden = false;
      dashboard.hidden = true;

      showMessage(
        "આ એકાઉન્ટને Admin અધિકાર મળ્યો નથી. સુરક્ષિત Admin સેટઅપ જરૂરી છે.",
        true
      );

      return;
    }

    isAdmin = true;
    loginSection.hidden = true;
    dashboard.hidden = false;
    welcome.textContent = "Admin: " + user.email;

    await loadAdminData();

  } catch (error) {
    isAdmin = false;
    loginSection.hidden = false;
    dashboard.hidden = true;
    showMessage(error.message, true);
  }
});

// Admin Login
loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;

  try {
    showMessage("લોગિન થઈ રહ્યું છે...");

    await signInWithEmailAndPassword(auth, email, password);

  } catch (error) {
    showMessage("લોગિન થયું નથી: " + error.message, true);
  }
});

// Logout
logoutButton.addEventListener("click", async () => {
  try {
    isAdmin = false;
    await signOut(auth);
  } catch (error) {
    alert("Logout થયું નથી: " + error.message);
  }
});
