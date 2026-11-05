import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = id => document.getElementById(id);

let currentUser = null;
let myShop = null;
let myShopId = null;
let shopImageData = "";
let productImageData = "";

const authSection = $("authSection");
const sellerDashboard = $("sellerDashboard");

function showMessage(id, message, error = false) {
  const element = $(id);
  element.textContent = message;
  element.style.color = error ? "#d93025" : "#087b45";
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

// મોબાઇલના ફોટાને નાનો કરીને Base64 બનાવે છે.
// Firebase Storageની જરૂર નથી.
function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("કૃપા કરીને સાચો ફોટો પસંદ કરો."));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");

        let width = image.width;
        let height = image.height;

        const maxSide = 640;

        if (width > maxSide || height > maxSide) {
          const ratio = Math.min(maxSide / width, maxSide / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("ફોટો તૈયાર થઈ શક્યો નથી."));
          return;
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        let result = canvas.toDataURL("image/jpeg", 0.65);

        if (result.length > 480000) {
          const smallerCanvas = document.createElement("canvas");

          const smallerWidth = Math.round(width * 0.7);
          const smallerHeight = Math.round(height * 0.7);

          smallerCanvas.width = smallerWidth;
          smallerCanvas.height = smallerHeight;

          const smallerContext = smallerCanvas.getContext("2d");

          smallerContext.fillStyle = "#ffffff";
          smallerContext.fillRect(0, 0, smallerWidth, smallerHeight);
          smallerContext.drawImage(
            image,
            0,
            0,
            smallerWidth,
            smallerHeight
          );

          result = smallerCanvas.toDataURL("image/jpeg", 0.5);
        }

        if (result.length > 480000) {
          reject(new Error("ફોટો હજુ મોટો છે. નાનો ફોટો પસંદ કરો."));
          return;
        }

        resolve(result);
      };

      image.onerror = () => reject(new Error("ફોટો ખોલી શકાયો નથી."));
      image.src = reader.result;
    };

    reader.onerror = () => reject(new Error("ફોટો વાંચી શકાયો નથી."));
    reader.readAsDataURL(file);
  });
}

// દુકાનનો ફોટો પસંદ કરવો
$("myShopImage").addEventListener("change", async event => {
  const file = event.target.files[0];

  if (!file) return;

  try {
    showMessage("sellerMessage", "દુકાનનો ફોટો તૈયાર થઈ રહ્યો છે...");

    shopImageData = await compressImage(file);

    $("shopImagePreview").src = shopImageData;
    $("shopImagePreview").classList.remove("hidden");

    showMessage("sellerMessage", "દુકાનનો ફોટો તૈયાર છે.");
  } catch (error) {
    shopImageData = "";
    showMessage("sellerMessage", error.message, true);
  }
});

// પ્રોડક્ટનો ફોટો પસંદ કરવો
$("productImage").addEventListener("change", async event => {
  const file = event.target.files[0];

  if (!file) return;

  try {
    showMessage("sellerMessage", "પ્રોડક્ટનો ફોટો તૈયાર થઈ રહ્યો છે...");

    productImageData = await compressImage(file);

    $("productImagePreview").src = productImageData;
    $("productImagePreview").classList.remove("hidden");

    showMessage("sellerMessage", "પ્રોડક્ટનો ફોટો તૈયાર છે.");
  } catch (error) {
    productImageData = "";
    showMessage("sellerMessage", error.message, true);
  }
});

// નવું સેલર રજિસ્ટ્રેશન
$("registerBtn").addEventListener("click", async () => {
  const name = $("sellerName").value.trim();
  const phone = $("sellerPhone").value.trim();
  const email = $("sellerEmail").value.trim();
  const password = $("sellerPassword").value;

  if (!name || !phone || !email || !password) {
    showMessage("authMessage", "બધી માહિતી ભરો.", true);
    return;
  }

  if (password.length < 6) {
    showMessage("authMessage", "Password ઓછામાં ઓછા 6 અક્ષરનો હોવો જોઈએ.", true);
    return;
  }

  try {
    $("registerBtn").disabled = true;
    showMessage("authMessage", "એકાઉન્ટ બની રહ્યું છે...");

    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    await setDoc(doc(db, "users", result.user.uid), {
      uid: result.user.uid,
      name,
      phone,
      email,
      role: "seller",
      createdAt: serverTimestamp()
    });

    showMessage("authMessage", "એકાઉન્ટ બની ગયું છે.");
  } catch (error) {
    showMessage("authMessage", error.message, true);
  } finally {
    $("registerBtn").disabled = false;
  }
});

// સેલર લોગિન
$("loginBtn").addEventListener("click", async () => {
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  if (!email || !password) {
    showMessage("authMessage", "Email અને Password ભરો.", true);
    return;
  }

  try {
    $("loginBtn").disabled = true;
    showMessage("authMessage", "લોગિન થઈ રહ્યું છે...");

    await signInWithEmailAndPassword(auth, email, password);

  } catch (error) {
    showMessage("authMessage", error.message, true);
  } finally {
    $("loginBtn").disabled = false;
  }
});

// લોગઆઉટ
$("logoutBtn").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    showMessage("sellerMessage", error.message, true);
  }
});

// સેલરની દુકાન શોધવી
async function loadMyShop() {
  const q = query(
    collection(db, "shops"),
    where("ownerUid", "==", currentUser.uid)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    myShop = null;
    myShopId = null;
    return;
  }

  const firstShop = snapshot.docs[0];

  myShopId = firstShop.id;
  myShop = firstShop.data();

  $("myShopName").value = myShop.name || myShop.shopName || "";
  $("myShopOwner").value = myShop.ownerName || "";
  $("myShopArea").value = myShop.area || myShop.village || "";
  $("myShopPhone").value = myShop.phone || "";
  $("myShopWhatsapp").value = myShop.whatsapp || "";
  $("myShopRule").value = myShop.minimumRule || "none";
  $("myShopMinimum").value = myShop.minimumValue || "";

  shopImageData = myShop.image || "";

  if (shopImageData) {
    $("shopImagePreview").src = shopImageData;
    $("shopImagePreview").classList.remove("hidden");
  }
}

// દુકાનની માહિતી સાચવવી
$("saveShopBtn").addEventListener("click", async () => {
  if (!currentUser) return;

  const name = $("myShopName").value.trim();
  const ownerName = $("myShopOwner").value.trim();
  const area = $("myShopArea").value.trim();
  const phone = $("myShopPhone").value.trim();
  const whatsapp = $("myShopWhatsapp").value.trim();
  const minimumRule = $("myShopRule").value;
  const minimumValue = Number($("myShopMinimum").value || 0);

  if (!name || !ownerName || !area || !phone) {
    showMessage("sellerMessage", "દુકાનની જરૂરી માહિતી ભરો.", true);
    return;
  }

  if (minimumRule === "custom" && minimumValue <= 0) {
    showMessage("sellerMessage", "કસ્ટમ લઘુત્તમ રકમ લખો.", true);
    return;
  }

  try {
    $("saveShopBtn").disabled = true;

    const shopData = {
      name,
      shopName: name,
      ownerName,
      area,
      village: area,
      phone,
      whatsapp,
      image: shopImageData || myShop?.image || "",
      minimumRule,
      minimumValue,
      ownerUid: currentUser.uid,
      updatedAt: serverTimestamp()
    };

    if (myShopId) {
      await updateDoc(doc(db, "shops", myShopId), shopData);
    } else {
      shopData.active = false;
      shopData.isActive = false;
      shopData.status = "pending";
      shopData.createdAt = serverTimestamp();

      const newShop = await addDoc(
        collection(db, "shops"),
        shopData
      );

      myShopId = newShop.id;
    }

    myShop = {
      ...myShop,
      ...shopData
    };

    $("myShopImage").value = "";

    showMessage(
      "sellerMessage",
      "દુકાનની માહિતી સાચવાઈ ગઈ છે. નવી દુકાન Adminની મંજૂરી પછી ગ્રાહકોને દેખાશે."
    );

    await loadMyProducts();
    await loadMyOrders();

  } catch (error) {
    showMessage("sellerMessage", error.message, true);
  } finally {
    $("saveShopBtn").disabled = false;
  }
});

// નવો પ્રોડક્ટ ઉમેરવો
$("saveProductBtn").addEventListener("click", async () => {
  if (!currentUser) return;

  if (!myShopId) {
    showMessage("sellerMessage", "પહેલા તમારી દુકાનની માહિતી સાચવો.", true);
    return;
  }

  const name = $("productName").value.trim();
  const category = $("productCategory").value.trim();
  const price = Number($("productPrice").value);
  const unit = $("productUnit").value;

  if (!name || !category || !Number.isFinite(price) || price <= 0) {
    showMessage("sellerMessage", "પ્રોડક્ટની બધી માહિતી યોગ્ય રીતે ભરો.", true);
    return;
  }

  try {
    $("saveProductBtn").disabled = true;
    showMessage("sellerMessage", "પ્રોડક્ટ ઉમેરાઈ રહ્યો છે...");

    await addDoc(collection(db, "products"), {
      shopId: myShopId,
      name,
      title: name,
      category,
      price,
      unit,
      image: productImageData,
      active: true,
      isActive: true,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    $("productName").value = "";
    $("productCategory").value = "";
    $("productPrice").value = "";
    $("productImage").value = "";
    $("productImagePreview").src = "";
    $("productImagePreview").classList.add("hidden");

    productImageData = "";

    showMessage("sellerMessage", "પ્રોડક્ટ સફળતાપૂર્વક ઉમેરાઈ ગયો.");

    await loadMyProducts();

  } catch (error) {
    showMessage("sellerMessage", error.message, true);
  } finally {
    $("saveProductBtn").disabled = false;
  }
});

// પોતાના પ્રોડક્ટ્સ બતાવવા
async function loadMyProducts() {
  const list = $("myProductList");
  list.innerHTML = "";

  if (!myShopId) {
    list.textContent = "પહેલા દુકાનની માહિતી સાચવો.";
    return;
  }

  try {
    const q = query(
      collection(db, "products"),
      where("shopId", "==", myShopId)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      list.textContent = "હજુ કોઈ પ્રોડક્ટ ઉમેર્યો નથી.";
      return;
    }

    snapshot.forEach(productDoc => {
      const product = productDoc.data();

      const item = document.createElement("div");
      item.className = "seller-item";

      const image = product.image || product.photo || "";

      item.innerHTML = `
        ${image ? `<img src="${escapeHTML(image)}" alt="Product">` : ""}
        <strong>${escapeHTML(product.name || product.title)}</strong>
        <p>કિંમત: ₹${escapeHTML(product.price)}</p>
        <p>એકમ: ${escapeHTML(product.unit || "")}</p>
        <p>કેટેગરી: ${escapeHTML(product.category || "")}</p>
        <button class="delete-btn" data-id="${escapeHTML(productDoc.id)}">
          પ્રોડક્ટ ડિલીટ કરો
        </button>
      `;

      item.querySelector(".delete-btn").addEventListener("click", async () => {
        if (!confirm("શું આ પ્રોડક્ટ ડિલીટ કરવો છે?")) return;

        try {
          await deleteDoc(doc(db, "products", productDoc.id));
          showMessage("sellerMessage", "પ્રોડક્ટ ડિલીટ થઈ ગયો.");
          await loadMyProducts();
        } catch (error) {
          showMessage("sellerMessage", error.message, true);
        }
      });

      list.appendChild(item);
    });

  } catch (error) {
    list.textContent = "પ્રોડક્ટ લોડ થઈ શક્યા નથી.";
    showMessage("sellerMessage", error.message, true);
  }
}

// પોતાની દુકાનના ઓર્ડર બતાવવા
async function loadMyOrders() {
  const list = $("myOrderList");
  list.innerHTML = "";

  if (!myShopId) {
    list.textContent = "દુકાન બનાવ્યા પછી ઓર્ડર અહીં દેખાશે.";
    return;
  }

  try {
    const q = query(
      collection(db, "orders"),
      where("shopId", "==", myShopId)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      list.textContent = "હજુ કોઈ ઓર્ડર આવ્યો નથી.";
      return;
    }

    snapshot.forEach(orderDoc => {
      const order = orderDoc.data();

      const item = document.createElement("div");
      item.className = "seller-item";

      const productsHTML = Array.isArray(order.items)
        ? order.items.map(product => `
            <li>
              ${escapeHTML(product.name || product.title || "પ્રોડક્ટ")}
              — ${escapeHTML(product.quantity ?? "")}
              ${escapeHTML(product.unit || "")}
            </li>
          `).join("")
        : "";

      item.innerHTML = `
        <strong>ઓર્ડર: ${escapeHTML(orderDoc.id)}</strong>
        <p>ગ્રાહક: ${escapeHTML(order.customerName || "")}</p>
        <p>મોબાઇલ: ${escapeHTML(order.customerPhone || "")}</p>
        <p>સરનામું: ${escapeHTML(order.customerAddress || "")}</p>
        <p>કુલ: ₹${escapeHTML(order.total || 0)}</p>
        <p>સ્થિતિ: ${escapeHTML(order.status || "pending")}</p>
        <ul>${productsHTML}</ul>
      `;

      list.appendChild(item);
    });

  } catch (error) {
    list.textContent = "ઓર્ડર લોડ થઈ શક્યા નથી.";
    showMessage("sellerMessage", error.message, true);
  }
}

// લોગિન સ્થિતિ તપાસવી
onAuthStateChanged(auth, async user => {
  currentUser = user;

  if (!user) {
    authSection.classList.remove("hidden");
    sellerDashboard.classList.add("hidden");
    myShop = null;
    myShopId = null;
    return;
  }

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (!userDoc.exists() || userDoc.data().role !== "seller") {
      await signOut(auth);
      showMessage("authMessage", "આ સેલર એકાઉન્ટ નથી.", true);
      return;
    }

    const sellerData = userDoc.data();

    authSection.classList.add("hidden");
    sellerDashboard.classList.remove("hidden");

    $("welcomeSeller").textContent =
      "નમસ્તે, " + (sellerData.name || user.email);

    await loadMyShop();
    await loadMyProducts();
    await loadMyOrders();

  } catch (error) {
    showMessage("sellerMessage", error.message, true);
  }
});