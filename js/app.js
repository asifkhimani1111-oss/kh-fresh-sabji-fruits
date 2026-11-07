
import { checkDevice, updateNetwork } from "./device.js";
import {
  startCamera,
  stopCamera,
  capturePhoto,
  loadGallery
} from "./camera.js";

import {
  startListening,
  stopListening,
  speakText,
  stopSpeaking
} from "./voice.js";

import { readText } from "./ocr.js";
import { detectObjects } from "./vision.js";
import { checkAICompatibility } from "./ai.js";
import { initializeOffline } from "./offline.js";

const $ = id => document.getElementById(id);

function showMessage(id, message) {
  const element = $(id);
  if (element) element.textContent = message;
}

function bindButton(id, callback) {
  const element = $(id);
  if (!element) return;
  element.addEventListener("click", async () => {
    try {
      await callback();
    } catch (error) {
      console.error(error);
      showMessage("systemMessage", "સુવિધામાં સમસ્યા આવી: " + error.message);
    }
  });
}

function initializeFeatures() {
  bindButton("checkDeviceBtn", checkDevice);

  bindButton("startCameraBtn", startCamera);
  bindButton("stopCameraBtn", stopCamera);
  bindButton("captureBtn", capturePhoto);

  bindButton("readTextBtn", readText);
  bindButton("detectBtn", detectObjects);

  bindButton("listenBtn", startListening);
  bindButton("stopListenBtn", stopListening);
  bindButton("speakBtn", speakText);
  bindButton("stopSpeakBtn", stopSpeaking);

  const gallery = $("galleryInput");

  if (gallery) {
    gallery.addEventListener("change", event => {
      loadGallery(event);
    });
  }

  const language = $("languageSelect");

  if (language) {
    const savedLanguage = localStorage.getItem("ayan-language");

    if (savedLanguage) {
      language.value = savedLanguage;
    }

    language.addEventListener("change", () => {
      localStorage.setItem("ayan-language", language.value);
    });
  }

  document.querySelectorAll("[data-feature]").forEach(button => {
    button.addEventListener("click", () => {
      const feature = button.dataset.feature;

      const sections = {
        camera: "cameraSection",
        ocr: "ocrSection",
        vision: "visionSection",
        voice: "voiceSection",
        ai: "aiSection",
        offline: "offlineSection"
      };

      const target = document.getElementById(sections[feature]);

      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });
  });
}

async function initializeAYAN() {
  showMessage("systemMessage", "AYAN સિસ્ટમ શરૂ થઈ રહી છે...");

  initializeFeatures();

  updateNetwork();

  await checkDevice();

  await checkAICompatibility();

  await initializeOffline();

  showMessage(
    "systemMessage",
    "AYAN તૈયાર છે. તમારા મોબાઇલની ક્ષમતા પ્રમાણે સુવિધાઓ ઉપલબ્ધ થશે."
  );
}

window.addEventListener("online", updateNetwork);
window.addEventListener("offline", updateNetwork);

initializeAYAN().catch(error => {
  console.error("AYAN initialization error:", error);

  showMessage(
    "systemMessage",
    "AYAN શરૂ કરવામાં સમસ્યા આવી. " + error.message
  );
});
