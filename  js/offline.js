

const $ = id => document.getElementById(id);

function showStatus(message) {
  const element = $("offlineStatus");

  if (element) {
    element.textContent = message;
  }
}

// ઇન્ટરનેટની સ્થિતિ તપાસો
function updateOfflineStatus() {
  const online = navigator.onLine;

  showStatus(
    online
      ? "ઇન્ટરનેટ ચાલુ છે. ઑનલાઇન સુવિધાઓ ઉપલબ્ધ છે."
      : "ઇન્ટરનેટ બંધ છે. કૅશ થયેલી સુવિધાઓ ઉપલબ્ધ હોઈ શકે છે."
  );
}

// Offline સિસ્ટમ શરૂ કરો
export async function initializeOffline() {
  updateOfflineStatus();

  window.addEventListener("online", updateOfflineStatus);
  window.addEventListener("offline", updateOfflineStatus);

  if (!("serviceWorker" in navigator)) {
    showStatus(
      "આ બ્રાઉઝરમાં Offline Service Worker સપોર્ટ નથી."
    );
    return false;
  }

  if (!window.isSecureContext) {
    showStatus(
      "Offline સુવિધા માટે HTTPS જરૂરી છે."
    );
    return false;
  }

  try {
    const registration =
      await navigator.serviceWorker.register("./sw.js");

    await navigator.serviceWorker.ready;

    showStatus(
      "AYAN Offline સિસ્ટમ તૈયાર છે. મુખ્ય ફાઇલો કૅશ થઈ શકે છે."
    );

    console.log("AYAN Service Worker:", registration);

    return true;

  } catch (error) {
    console.error("Offline Error:", error);

    showStatus(
      "Offline સિસ્ટમ શરૂ થઈ શકી નથી. Service Worker ફાઇલ તપાસો."
    );

    return false;
  }
}
