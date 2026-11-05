
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
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

let currentUser = null;
let myShops = [];
let myProducts = [];

let shopPhotoBase64 = "";
let productPhotoBase64 = "";

let editShopPhotoBase64 = "";
let editProductPhotoBase64 = "";

let editShopPhotoReady = true;
let editProductPhotoReady = true;

const MAX_IMAGE_SIZE = 180 * 1024;

// ફોટો નાનો કરીને JPEG Base64 બનાવવો
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

      const width = Math.max(
        1,
        Math.round(image.width * ratio)
      );

      const height = Math.max(
        1,
        Math.round(image.height * ratio)
      );

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("ફોટો કમ્પ્રેસ થઈ શક્યો નથી.");
      }

      context.drawImage(image, 0, 0, width, height);

      for (const quality of qualities) {
        const blob = await new Promise((resolve) => {
          canvas.toBlob(resolve, "image/jpeg", quality);
        });

        if (blob && blob.size <= MAX_IMAGE_SIZE) {
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
      "ફોટો હજી મોટો છે. કૃપા કરીને નાનો ફોટો પસંદ કરો."
    );

  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function showMessage(message, isError = false) {
  const element = $("sellerMessage");

  if (!element) return;

  element.textContent = message;
  element.style.color = isError ? "red" : "green";
}

function makeButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function makePhoto(src, alt, maxWidth = "140px") {
  if (!src) return null;

  const image = document.createElement("img");
  image.src = src;
  image.alt = alt;
  image.style.maxWidth = maxWidth;
  image.style.maxHeight = "160px";
  image.style.objectFit = "contain";
  image.style.display = "block";

  return image;
}

// નવી દુકાન અને વસ્તુના ફોટા
async function preparePhoto(inputId, previewId, type) {
  const file = $(inputId).files[0];
  const preview = $(previewId);

  if (!file) {
    if (type === "shop") shopPhotoBase64 = "";
    if (type === "product") productPhotoBase64 = "";

    preview.hidden = true;
    return;
  }

  try {
    preview.hidden = false;
    preview.alt = "ફોટો તૈયાર થઈ રહ્યો છે...";
    preview.removeAttribute("src");

    const compressed = await compressImage(file);

    preview.src = compressed;
    preview.alt = "ફોટાનું પ્રિવ્યૂ";

    if (type === "shop") {
      shopPhotoBase64 = compressed;
    }

    if (type === "product") {
      productPhotoBase64 = compressed;
    }

    showMessage("ફોટો તૈયાર થઈ ગયો છે.");

  } catch (error) {
    if (type === "shop") shopPhotoBase64 = "";
    if (type === "product") productPhotoBase64 = "";

    preview.hidden = true;
    showMessage(error.message, true);
  }
}

$("shopPhoto").addEventListener("change", () => {
  preparePhoto("shopPhoto", "shopPhotoPreview", "shop");
});

$("productPhoto").addEventListener("change", () => {
  preparePhoto("productPhoto", "productPhotoPreview", "product");
});

// દુકાનના ફોટામાં ફેરફાર
$("editShopPhoto").addEventListener("change", async () => {
  const file = $("editShopPhoto").files[0];

  if (!file) return;

  editShopPhotoReady = false;

  try {
    const compressed = await compressImage(file);

    editShopPhotoBase64 = compressed;

    const preview = $("editShopPhotoPreview");
    preview.src = compressed;
    preview.hidden = false;

    editShopPhotoReady = true;
    showMessage("દુકાનનો નવો ફોટો તૈયાર છે.");

  } catch (error) {
    editShopPhotoReady = true;
    showMessage(error.message, true);
  }
});

// વસ્તુના ફોટામાં ફેરફાર
$("editProductPhoto").addEventListener("change", async () => {
  const file = $("editProductPhoto").files[0];

  if (!file) return;

  editProductPhotoReady = false;

  try {
    const compressed = await compressImage(file);

    editProductPhotoBase64 = compressed;

    const preview = $("editProductPhotoPreview");
    preview.src = compressed;
    preview.hidden = false;

    editProductPhotoReady = true;
    showMessage("વસ્તુનો નવો ફોટો તૈયાર છે.");

  } catch (error) {
    editProductPhotoReady = true;
    showMessage(error.message, true);
  }
});

// Seller રજિસ્ટ્રેશન
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

    await setDoc(
      doc(db, "sellerProfiles", result.user.uid),
      {
        name,
        email,
        createdAt: serverTimestamp()
      }
    );

    showMessage("એકાઉન્ટ બની ગયું છે.");

  } catch (error) {
    showMessage(error.message, true);
  }
});

// Seller Login
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

// Login સ્થિતિ
onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  $("authSection").hidden = !!user;
  $("dashboard").hidden = !user;

  if (user) {
    $("sellerEmailDisplay").textContent = user.email || "";

    await loadMyShops();
    await loadMyProducts();

  } else {
    myShops = [];
    myProducts = [];
    $("sellerShops").replaceChildren();
    $("sellerProducts").replaceChildren();
  }
});

// પોતાની દુકાનો લોડ કરવી
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
    showMessage(
      "દુકાનો લોડ થઈ શકી નથી: " + error.message,
      true
    );
  }
}

// પોતાની વસ્તુઓ લોડ કરવી
async function loadMyProducts() {
  if (!currentUser) return;

  try {
    const q = query(
      collection(db, "products"),
      where("ownerUid", "==", currentUser.uid)
    );

    const snapshot = await getDocs(q);

    myProducts = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    renderMyProducts();

  } catch (error) {
    showMessage(
      "વસ્તુઓ લોડ થઈ શકી નથી: " + error.message,
      true
    );
  }
}

// દુકાનો બતાવવી
function renderMyShops() {
  const list = $("sellerShops");
  const select = $("myShop");

  list.replaceChildren();

  select.replaceChildren();

  const firstOption = document.createElement("option");
  firstOption.value = "";
  firstOption.textContent = "દુકાન પસંદ કરો";
  select.appendChild(firstOption);

  myShops.forEach((shop) => {
    const option = document.createElement("option");
    option.value = shop.id;
    option.textContent = shop.name;
    select.appendChild(option);

    const card = document.createElement("div");

    const photo = makePhoto(
      shop.photoBase64 || shop.imageUrl || shop.photoUrl,
      shop.name
    );

    if (photo) card.appendChild(photo);

    const heading = document.createElement("h3");
    heading.textContent = shop.name || "";

    const category = document.createElement("p");
    category.textContent = "કેટેગરી: " + (shop.category || "");

    const area = document.createElement("p");
    area.textContent = "વિસ્તાર: " + (shop.area || "");

    const whatsapp = document.createElement("p");
    whatsapp.textContent = "WhatsApp: " + (shop.whatsapp || "");

    const status = document.createElement("p");
    status.textContent = shop.approved
      ? "દુકાન મંજૂર છે"
      : "Adminની મંજૂરી બાકી છે";

    const editButton = makeButton(
      "દુકાન Edit કરો",
      () => openShopEdit(shop)
    );

    const deleteButton = makeButton(
      "દુકાન Delete કરો",
      () => deleteMyShop(shop)
    );

    card.append(
      heading,
      category,
      area,
      whatsapp,
      status,
      editButton,
      deleteButton
    );

    card.style.border = "1px solid #ccc";
    card.style.padding = "12px";
    card.style.margin = "12px 0";

    list.appendChild(card);
  });

  if (myShops.length === 0) {
    list.textContent = "હજુ કોઈ દુકાન ઉમેરેલી નથી.";
  }
}

// પોતાની વસ્તુઓ બતાવવી
function renderMyProducts() {
  const list = $("sellerProducts");
  list.replaceChildren();

  myProducts.forEach((product) => {
    const card = document.createElement("div");

    const photo = makePhoto(
      product.photoBase64 || product.imageUrl || product.photoUrl,
      product.name
    );

    if (photo) card.appendChild(photo);

    const heading = document.createElement("h3");
    heading.textContent = product.name || "";

    const shop = myShops.find(
      (item) => item.id === product.shopId
    );

    const shopName = document.createElement("p");
    shopName.textContent = "દુકાન: " + (shop?.name || "અજ્ઞાત");

    const price = document.createElement("p");
    price.textContent =
      "ભાવ: ₹" + product.price + " / " + (product.unit || "");

    const status = document.createElement("p");
    status.textContent = product.approved
      ? "વસ્તુ મંજૂર છે"
      : "Adminની મંજૂરી બાકી છે";

    const editButton = makeButton(
      "વસ્તુ Edit કરો",
      () => openProductEdit(product)
    );

    const deleteButton = makeButton(
      "વસ્તુ Delete કરો",
      () => deleteMyProduct(product)
    );

    card.append(
      heading,
      shopName,
      price,
      status,
      editButton,
      deleteButton
    );

    card.style.border = "1px solid #ccc";
    card.style.padding = "12px";
    card.style.margin = "12px 0";

    list.appendChild(card);
  });

  if (myProducts.length === 0) {
    list.textContent = "હજુ કોઈ વસ્તુ ઉમેરેલી નથી.";
  }
}

// નવી દુકાન ઉમેરવી
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

  if ($("shopPhoto").files.length > 0 && !shopPhotoBase64) {
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
    shopPhotoBase64 = "";

    showMessage(
      "દુકાન ઉમેરાઈ ગઈ. Adminની મંજૂરીની રાહ જુઓ."
    );

    await loadMyShops();

  } catch (error) {
    showMessage("દુકાન ઉમેરી શકાઈ નથી: " + error.message, true);
  }
});

// નવી વસ્તુ ઉમેરવી
$("productForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    showMessage("પહેલા લોગિન કરો.", true);
    return;
  }

  if ($("productPhoto").files.length > 0 && !productPhotoBase64) {
    showMessage("વસ્તુનો ફોટો તૈયાર થવા દો.", true);
    return;
  }

  const shopId = $("myShop").value;

  const selectedShop = myShops.find(
    (shop) => shop.id === shopId
  );

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
    productPhotoBase64 = "";

    showMessage(
      "વસ્તુ ઉમેરાઈ ગઈ. Adminની મંજૂરીની રાહ જુઓ."
    );

    await loadMyProducts();

  } catch (error) {
    showMessage("વસ્તુ ઉમેરી શકાઈ નથી: " + error.message, true);
  }
});

// દુકાન Edit ફોર્મ ખોલવું
function openShopEdit(shop) {
  $("editShopId").value = shop.id;
  $("editShopName").value = shop.name || "";
  $("editShopCategory").value = shop.category || "";
  $("editShopArea").value = shop.area || "";
  $("editShopWhatsapp").value = shop.whatsapp || "";
  $("editShopRule").value = shop.rule || "none";

  editShopPhotoBase64 = shop.photoBase64 || "";
  editShopPhotoReady = true;

  $("editShopPhoto").value = "";

  const preview = $("editShopPhotoPreview");

  if (editShopPhotoBase64) {
    preview.src = editShopPhotoBase64;
    preview.hidden = false;
  } else {
    preview.hidden = true;
  }

  $("editShopForm").hidden = false;
  $("editProductForm").hidden = true;

  $("editShopForm").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// દુકાનની માહિતી સેવ કરવી
$("editShopForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) return;

  if (!editShopPhotoReady) {
    showMessage("ફોટો તૈયાર થવા દો.", true);
    return;
  }

  const shopId = $("editShopId").value;
  const whatsapp = $("editShopWhatsapp").value.trim();

  if (!/^[6-9][0-9]{9}$/.test(whatsapp)) {
    showMessage("સાચો 10 અંકનો WhatsApp નંબર લખો.", true);
    return;
  }

  try {
    await updateDoc(doc(db, "shops", shopId), {
      name: $("editShopName").value.trim(),
      category: $("editShopCategory").value.trim(),
      area: $("editShopArea").value.trim(),
      whatsapp,
      rule: $("editShopRule").value,
      photoBase64: editShopPhotoBase64
    });

    $("editShopForm").hidden = true;

    showMessage("દુકાનની માહિતી અપડેટ થઈ ગઈ.");

    await loadMyShops();

  } catch (error) {
    showMessage("દુકાન અપડેટ થઈ શકી નથી: " + error.message, true);
  }
});

// દુકાન Edit રદ
$("cancelShopEdit").addEventListener("click", () => {
  $("editShopForm").hidden = true;
});

// દુકાન Delete
async function deleteMyShop(shop) {
  if (!currentUser || shop.ownerUid !== currentUser.uid) {
    showMessage("આ દુકાન ડિલીટ કરવાની પરવાનગી નથી.", true);
    return;
  }

  const confirmed = confirm(
    "શું તમે ખરેખર આ દુકાન ડિલીટ કરવા માંગો છો?\n\n" +
    "આ દુકાનની બધી વસ્તુઓ પણ ડિલીટ થશે. જૂના ઓર્ડર આપમેળે ડિલીટ નહીં થાય."
  );

  if (!confirmed) return;

  try {
    showMessage("દુકાનની વસ્તુઓ ડિલીટ થઈ રહી છે...");

    const q = query(
      collection(db, "products"),
      where("shopId", "==", shop.id)
    );

    const snapshot = await getDocs(q);

    for (const item of snapshot.docs) {
      if (item.data().ownerUid !== currentUser.uid) {
        throw new Error("કોઈ વસ્તુની માલિકીની તપાસ નિષ્ફળ ગઈ.");
      }

      await deleteDoc(doc(db, "products", item.id));
    }

    await deleteDoc(doc(db, "shops", shop.id));

    $("editShopForm").hidden = true;

    showMessage("દુકાન અને તેની વસ્તુઓ ડિલીટ થઈ ગઈ.");

    await loadMyShops();
    await loadMyProducts();

  } catch (error) {
    showMessage("દુકાન ડિલીટ થઈ શકી નથી: " + error.message, true);
  }
}

// વસ્તુ Edit ફોર્મ ખોલવું
function openProductEdit(product) {
  $("editProductId").value = product.id;
  $("editProductName").value = product.name || "";
  $("editProductPrice").value = product.price || "";
  $("editProductUnit").value = product.unit || "";

  editProductPhotoBase64 = product.photoBase64 || "";
  editProductPhotoReady = true;

  $("editProductPhoto").value = "";

  const preview = $("editProductPhotoPreview");

  if (editProductPhotoBase64) {
    preview.src = editProductPhotoBase64;
    preview.hidden = false;
  } else {
    preview.hidden = true;
  }

  $("editProductForm").hidden = false;
  $("editShopForm").hidden = true;

  $("editProductForm").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// વસ્તુની માહિતી સેવ કરવી
$("editProductForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) return;

  if (!editProductPhotoReady) {
    showMessage("ફોટો તૈયાર થવા દો.", true);
    return;
  }

  const productId = $("editProductId").value;
  const name = $("editProductName").value.trim();
  const price = Number($("editProductPrice").value);
  const unit = $("editProductUnit").value.trim();

  if (!name || !unit || !Number.isFinite(price) || price <= 0) {
    showMessage("વસ્તુની સાચી માહિતી ભરો.", true);
    return;
  }

  try {
    const product = myProducts.find(
      (item) => item.id === productId
    );

    if (!product || product.ownerUid !== currentUser.uid) {
      showMessage("આ વસ્તુ તમારી નથી.", true);
      return;
    }

    await updateDoc(doc(db, "products", productId), {
      name,
      price,
      unit,
      photoBase64: editProductPhotoBase64
    });

    $("editProductForm").hidden = true;

    showMessage("વસ્તુની માહિતી અપડેટ થઈ ગઈ.");

    await loadMyProducts();

  } catch (error) {
    showMessage("વસ્તુ અપડેટ થઈ શકી નથી: " + error.message, true);
  }
});

// વસ્તુ Edit રદ
$("cancelProductEdit").addEventListener("click", () => {
  $("editProductForm").hidden = true;
});

// વસ્તુ Delete
async function deleteMyProduct(product) {
  if (!currentUser || product.ownerUid !== currentUser.uid) {
    showMessage("આ વસ્તુ ડિલીટ કરવાની પરવાનગી નથી.", true);
    return;
  }

  if (!confirm("શું તમે આ વસ્તુ ડિલીટ કરવા માંગો છો?")) {
    return;
  }

  try {
    await deleteDoc(doc(db, "products", product.id));

    $("editProductForm").hidden = true;

    showMessage("વસ્તુ ડિલીટ થઈ ગઈ.");

    await loadMyProducts();

  } catch (error) {
    showMessage("વસ્તુ ડિલીટ થઈ શકી નથી: " + error.message, true);
  }
}
