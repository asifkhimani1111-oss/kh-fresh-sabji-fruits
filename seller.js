// ------------------------------
// નવી વસ્તુ ઉમેરવી (માપતોલ વિકલ્પ સાથે)
// ------------------------------
$("productForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (addingProduct) return;

  if (!currentUser) {
    showMessage("પહેલા લોગિન કરો.", true);
    return;
  }

  if ($("productPhoto").files.length > 0 && !productPhotoBase64) {
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
  const originalPrice = Number($("productOriginalPrice")?.value || price);
  const unit = $("productUnit").value.trim();

  if (!name || !unit || !Number.isFinite(price) || price <= 0) {
    showMessage("વસ્તુની સાચી માહિતી અને માપતોલ ભરો.", true);
    return;
  }

  const button = $("productForm").querySelector('button[type="submit"]');

  try {
    addingProduct = true;
    button.disabled = true;
    button.textContent = "સેવ થઈ રહ્યું છે...";

    // Firestore માં નવો ડોક્યુમેન્ટ ઉમેરવો
    const docRef = await addDoc(collection(db, "products"), {
      ownerUid: currentUser.uid,
      shopId: shopId,
      name: name,
      price: price,
      originalPrice: originalPrice > price ? originalPrice : price,
      unit: unit,
      photoBase64: productPhotoBase64,
      approved: true, // આપમેળે મંજૂર અથવા એડમિન મુજબ
      createdAt: serverTimestamp()
    });

    // લોકલ લિસ્ટ રીફ્રેશ કરવું
    await loadMyProducts();

    $("productForm").reset();
    $("productPhotoPreview").hidden = true;
    productPhotoBase64 = "";

    showMessage("✅ વસ્તુ સફળતાપૂર્વક ઉમેરાઈ ગઈ!");

  } catch (error) {
    showMessage("વસ્તુ સેવ થઈ શકી નથી: " + error.message, true);
  } finally {
    addingProduct = false;
    button.disabled = false;
    button.textContent = "વસ્તુ ઉમેરો";
  }
});