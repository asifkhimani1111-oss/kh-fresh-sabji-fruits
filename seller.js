
import { auth, db } from "./firebase.js";

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

const $ = (id) => document.getElementById(id);

let currentUser = null;
let myShops = [];
let shopPhotoBase64 = "";
let productPhotoBase64 = "";

const MAX_IMAGE_SIZE = 180 * 1024;

async function compressImage(file) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("કૃપા કરીને સાચો ફોટો પસંદ કરો.");
  }

  const imageUrl = URL.createObjectURL(file);

  try {
    const image = new Image();

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(
        new Error("ફોટો ખોલી શકાયો નથી.")
      );
      image.src = imageUrl;
    });

    const sizes = [640, 480, 360, 280];
    const qualities = [0.65, 0.5, 0.4, 0.3];

    for (const maxSize of sizes) {
      const ratio = Math.min(
        1,
        maxSize / Math.max(image.width, image.height)
      );

      const width = Math.max(1, Math.round(image.width * ratio));
      const height = Math.max(1, Math.round(image.height * ratio));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("ફોટો તૈયાર થઈ શક્યો નથી.");
      }

      context.drawImage(image, 0, 0, width, height);

      for (const quality of qualities) {
        const blob = await new Promise((resolve) => {
          canvas.toBlob(resolve, "image/jpeg", quality);
        });

        if (!blob) continue;

        if (blob.size <= MAX_IMAGE_SIZE) {
          return await new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(
              new Error("ફોટો વાંચી શકાયો નથી.")
            );

            reader.readAsDataURL(blob);
          });
        }
      }
    }

    throw new Error(
      "ફોટો મોટો છે. કૃપા કરીને બીજો નાનો ફોટો પસંદ કરો."
    );

  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function preparePhoto(inputId, previewId, type) {
  const input = $(inputId);
  const preview = $(previewId);
  const file = input.files && input.files[0];

  if (type === "shop") shopPhotoBase64 = "";
  if (type === "product") productPhotoBase64 = "";

  preview.hidden = true;
  preview.removeAttribute("src");

  if (!file) return;

  try {
    showMessage("ફોટો તૈયાર થઈ રહ્યો છે...");

    const compressed = await compressImage(file);

    preview.onload = () => {
      preview.hidden = false;
    };

    preview.onerror = () => {
      preview.hidden = true;
      showMessage("ફોટાનું Preview દેખાડી શકાયું નથી.", true);
    };

    preview.src = compressed;

    if (type === "shop") {
      shopPhotoBase64 = compressed;
    } else {
      productPhotoBase64 = compressed;
    }

    showMessage("ફોટો તૈયાર થઈ ગયો છે.");

  } catch (error) {
    preview.hidden = true;
    preview.removeAttribute("src");

    if (type === "shop") shopPhotoBase64 = "";
    if (type === "product") productPhotoBase64 = "";

    showMessage(error.message, true);
  }
}

function showMessage(message, isError = false) {
  const element = $("sellerMessage");

  if (!element) return;

  element.textContent = message;
  element.style.color = isError ? "red" : "green";
}

$("shopPhoto").addEventListener("change", () => {
  preparePhoto("shopPhoto", "shopPhotoPreview", "shop");
});

$("productPhoto").addEventListener("change", () => {
  preparePhoto("productPhoto", "productPhotoPreview", "product");
});

// Seller registration
$("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = $("sellerName").value.trim();
  const email = $("sellerEmail").value.trim();
  const password = $("sellerPassword").value;

  if (!name || !email || !password) {
    showMessage("બધી માહિતી ભરો.", true);
    return;
  }

  try {
    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    await setDoc(doc(db, "sellerProfiles", result.user.uid), {
      name,
      email,
      createdAt: serverTimestamp()
    });

    showMessage("એકાઉન્ટ બની ગયું છે.");

  } catch (error) {
    showMessage(error.message, true);
  }
});

// Seller login
$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await signInWithEmailAndPassword(
      auth,
      $("loginEmail").value.trim(),
      $("loginPassword").value
    );

    showMessage("લોગિન સફળ થયું.");

  } catch (error) {
    showMessage(error.message, true);
  }
});

// Logout
$("logoutButton").addEventListener("click", async () => {
  try {
    await signOut(auth);
    showMessage("લોગઆઉટ થઈ ગયું.");
  } catch (error) {
    showMessage(error.message, true);
  }
});

// Login state
onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  $("authSection").hidden = !!user;
  $("dashboard").hidden = !user;

  if (user) {
    $("sellerEmailDisplay").textContent = user.email || "";
    await loadMyShops();
  } else {
    myShops = [];
  }
});

// Load seller shops
async function loadMyShops() {
  if (!currentUser) return;

  try {
    const q = query(
      collection(db, "shops"),
      where("ownerUid", "==", currentUser.uid)
    );

    const snapshot = await getDocs(q);

    myShops = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    renderMyShops();

  } catch (error) {
    showMessage("દુકાનો લોડ થઈ શકી નથી: " + error.message, true);
  }
}

// Render shops
function renderMyShops() {
  const list = $("sellerShops");
  const select = $("myShop");

  list.replaceChildren();
  select.innerHTML = '<option value="">દુકાન પસંદ કરો</option>';

  myShops.forEach((shop) => {
    const option = document.createElement("option");
    option.value = shop.id;
    option.textContent = shop.name;
    select.appendChild(option);

    const card = document.createElement("div");

    if (shop.photoBase64) {
      const photo = document.createElement("img");
      photo.src = shop.photoBase64;
      photo.alt = shop.name;
      photo.style.maxWidth = "140px";
      photo.style.display = "block";
      card.appendChild(photo);
    }

    const heading = document.createElement("h3");
    heading.textContent = shop.name;

    const area = document.createElement("p");
    area.textContent = "વિસ્તાર: " + (shop.area || "");

    const whatsapp = document.createElement("p");
    whatsapp.textContent = shop.whatsapp
      ? "WhatsApp: +91 " + shop.whatsapp
      : "WhatsApp નંબર ઉપલબ્ધ નથી.";

    const status = document.createElement("p");
    status.textContent = shop.approved
      ? "દુકાન મંજૂર છે"
      : "Adminની મંજૂરી બાકી છે";

    card.append(heading, area, whatsapp, status);
    list.appendChild(card);
  });
}

// Add shop
$("shopForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    showMessage("પહેલા લોગિન કરો.", true);
    return;
  }

  const whatsapp = $("shopWhatsapp").value.trim();

  if (!/^[6-9][0-9]{9}$/.test(whatsapp)) {
    showMessage("સાચો 10 અંકનો WhatsApp નંબર લખો.", true);
    return;
  }

  if ($("shopPhoto").files.length && !shopPhotoBase64) {
    showMessage("દુકાનનો ફોટો તૈયાર થવા દો.", true);
    return;
  }

  try {
    await addDoc(collection(db, "shops"), {
      ownerUid: currentUser.uid,
      name: $("shopName").value.trim(),
      category: $("shopCategory").value.trim(),
      area: $("shopArea").value.trim(),
      whatsapp,
      rule: $("shopRule").value,
      photoBase64: shopPhotoBase64,
      approved: false,
      createdAt: serverTimestamp()
    });

    $("shopForm").reset();
    $("shopPhotoPreview").hidden = true;
    $("shopPhotoPreview").removeAttribute("src");
    shopPhotoBase64 = "";

    showMessage("દુકાન ઉમેરાઈ ગઈ. Adminની મંજૂરીની રાહ જુઓ.");
    await loadMyShops();

  } catch (error) {
    showMessage("દુકાન ઉમેરી શકાઈ નથી: " + error.message, true);
  }
});

// Add product
$("productForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    showMessage("પહેલા લોગિન કરો.", true);
    return;
  }

  if ($("productPhoto").files.length && !productPhotoBase64) {
    showMessage("વસ્તુનો ફોટો તૈયાર થવા દો.", true);
    return;
  }

  const shopId = $("myShop").value;
  const selectedShop = myShops.find((shop) => shop.id === shopId);

  if (!selectedShop) {
    showMessage("તમારી દુકાન પસંદ કરો.", true);
    return;
  }

  const name = $("productName").value.trim();
  const price = Number($("productPrice").value);
  const unit = $("productUnit").value.trim();

  if (!name || !unit || !Number.isFinite(price) || price <= 0) {
    showMessage("વસ્તુની સાચી માહિતી ભરો.", true);
    return;
  }

  try {
    await addDoc(collection(db, "products"), {
      ownerUid: currentUser.uid,
      shopId,
      name,
      price,
      unit,
      photoBase64: productPhotoBase64,
      approved: false,
      createdAt: serverTimestamp()
    });

    $("productForm").reset();
    $("productPhotoPreview").hidden = true;
    $("productPhotoPreview").removeAttribute("src");
    productPhotoBase64 = "";

    showMessage("વસ્તુ ઉમેરાઈ ગઈ. Adminની મંજૂરીની રાહ જુઓ.");

  } catch (error) {
    showMessage("વસ્તુ ઉમેરી શકાઈ નથી: " + error.message, true);
  }
});
