import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { auth, db } from "./firebase.js";

const authForm = document.getElementById("sellerAuthForm");
const authMessage = document.getElementById("sellerAuthMessage");
const authSection = document.getElementById("sellerAuth");
const dashboard = document.getElementById("sellerDashboard");

const shopForm = document.getElementById("shopForm");
const productForm = document.getElementById("productForm");
const myShop = document.getElementById("myShop");
const sellerShops = document.getElementById("sellerShops");
const sellerWelcome = document.getElementById("sellerWelcome");
const logoutButton = document.getElementById("sellerLogout");

let currentUser = null;
let myShops = [];

function showMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? "red" : "green";
}

function showDashboard(user) {
  currentUser = user;
  authSection.hidden = true;
  dashboard.hidden = false;

  sellerWelcome.textContent =
    "લોગિન થયેલ ઈમેલ: " + user.email;

  loadSellerShops();
}

function showLogin() {
  currentUser = null;
  myShops = [];
  authSection.hidden = false;
  dashboard.hidden = true;
  sellerShops.textContent = "";
  myShop.innerHTML = "";
}

function getErrorMessage(error) {
  const messages = {
    "auth/email-already-in-use":
      "આ ઈમેલથી એકાઉન્ટ પહેલેથી બનેલું છે.",
    "auth/invalid-email":
      "ઈમેલ સરનામું સાચું નથી.",
    "auth/weak-password":
      "પાસવર્ડ ઓછામાં ઓછા 6 અક્ષરનો હોવો જોઈએ.",
    "auth/invalid-credential":
      "ઈમેલ અથવા પાસવર્ડ ખોટો છે.",
    "auth/network-request-failed":
      "ઈન્ટરનેટ કનેક્શન તપાસો.",
    "permission-denied":
      "Firebase Rules અથવા પરવાનગી તપાસો."
  };

  return messages[error.code] ||
    error.message ||
    "કંઈક ભૂલ થઈ. ફરી પ્રયાસ કરો.";
}

// Registration અને Login
authForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  const action = event.submitter?.value || "login";
  const name = document.getElementById("sellerName").value.trim();
  const email = document.getElementById("sellerEmail").value.trim();
  const password = document.getElementById("sellerPassword").value;

  if (action === "register" && !name) {
    showMessage("નવું એકાઉન્ટ બનાવવા તમારું નામ લખો.", true);
    return;
  }

  try {
    showMessage("કૃપા કરીને રાહ જુઓ...");

    if (action === "register") {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await setDoc(doc(db, "sellerProfiles", result.user.uid), {
        name: name,
        email: email,
        createdAt: serverTimestamp()
      });

      showMessage("એકાઉન્ટ બની ગયું છે.");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      showMessage("લોગિન સફળ થયું.");
    }

  } catch (error) {
    showMessage(getErrorMessage(error), true);
  }
});

// Login થયેલા સેલરને ઓળખો
onAuthStateChanged(auth, function(user) {
  if (user) {
    showDashboard(user);
  } else {
    showLogin();
  }
});

// સેલરની પોતાની દુકાનો લાવો
async function loadSellerShops() {
  if (!currentUser) return;

  sellerShops.textContent = "દુકાનો લોડ થઈ રહી છે...";
  myShop.innerHTML = "";

  try {
    const shopsQuery = query(
      collection(db, "shops"),
      where("ownerUid", "==", currentUser.uid)
    );

    const snapshot = await getDocs(shopsQuery);

    myShops = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    sellerShops.innerHTML = "";

    if (myShops.length === 0) {
      sellerShops.textContent = "હજુ કોઈ દુકાન ઉમેરેલી નથી.";
    }

    myShops.forEach(shop => {
      const card = document.createElement("div");
      const heading = document.createElement("h3");
      const area = document.createElement("p");
      const phone = document.createElement("p");
      const status = document.createElement("p");

      heading.textContent = shop.name;
      area.textContent = "વિસ્તાર: " + shop.area;

      phone.textContent = shop.whatsapp
        ? "WhatsApp: +91 " + shop.whatsapp
        : "WhatsApp નંબર ઉપલબ્ધ નથી.";

      status.textContent = shop.approved
        ? "દુકાન મંજૂર છે"
        : "Adminની મંજૂરી બાકી છે";

      card.append(heading, area, phone, status);
      sellerShops.appendChild(card);

      const option = document.createElement("option");
      option.value = shop.id;
      option.textContent = shop.name;
      myShop.appendChild(option);
    });

  } catch (error) {
    sellerShops.textContent =
      "દુકાનો લોડ થઈ શકી નથી: " + getErrorMessage(error);
  }
}

// નવી દુકાન ઉમેરો
shopForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  if (!currentUser) {
    alert("પહેલા લોગિન કરો.");
    return;
  }

  const name = document.getElementById("shopName").value.trim();
  const category = document.getElementById("shopCategory").value.trim();
  const area = document.getElementById("shopArea").value.trim();
  const rule = document.getElementById("shopRule").value;

  const whatsappInput =
    document.getElementById("shopWhatsapp");

  const whatsapp = whatsappInput.value.trim();

  if (!/^[6-9][0-9]{9}$/.test(whatsapp)) {
    alert("સાચો 10 અંકનો WhatsApp નંબર લખો.");
    whatsappInput.focus();
    return;
  }

  try {
    await addDoc(collection(db, "shops"), {
      ownerUid: currentUser.uid,
      name: name,
      category: category,
      area: area,
      whatsapp: whatsapp,
      rule: rule,
      approved: false,
      createdAt: serverTimestamp()
    });

    alert(
      "દુકાન અને WhatsApp નંબર સફળતાપૂર્વક ઉમેરાયા. " +
      "Adminની મંજૂરી પછી ગ્રાહકોને દેખાશે."
    );

    shopForm.reset();
    await loadSellerShops();

  } catch (error) {
    alert("દુકાન ઉમેરી શકાઈ નથી: " + getErrorMessage(error));
  }
});

// દુકાનમાં વસ્તુ ઉમેરો
productForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  if (!currentUser) {
    alert("પહેલા લોગિન કરો.");
    return;
  }

  const shopId = myShop.value;
  const shop = myShops.find(item => item.id === shopId);

  if (!shop) {
    alert("પહેલા તમારી દુકાન બનાવો.");
    return;
  }

  const name = document.getElementById("productName").value.trim();
  const price = Number(document.getElementById("productPrice").value);
  const unit = document.getElementById("productUnit").value.trim();

  if (!name || !unit || !Number.isFinite(price) || price <= 0) {
    alert("વસ્તુની સાચી માહિતી ભરો.");
    return;
  }

  try {
    await addDoc(collection(db, "products"), {
      ownerUid: currentUser.uid,
      shopId: shopId,
      name: name,
      price: price,
      unit: unit,
      approved: false,
      createdAt: serverTimestamp()
    });

    alert("વસ્તુ ઉમેરાઈ ગઈ છે.");
    productForm.reset();

  } catch (error) {
    alert("વસ્તુ ઉમેરી શકાઈ નથી: " + getErrorMessage(error));
  }
});

// Logout
logoutButton.addEventListener("click", async function() {
  try {
    await signOut(auth);
  } catch (error) {
    alert("લોગઆઉટ થઈ શક્યું નથી: " + getErrorMessage(error));
  }
});