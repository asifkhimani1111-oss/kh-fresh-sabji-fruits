

import { } from "./device.js";

const $ = id => document.getElementById(id);

export let currentImage = null;

let cameraStream = null;

function showMessage(message) {
  const result = $("cameraResult");
  if (result) result.textContent = message;
}

function getCanvas() {
  return $("cameraCanvas");
}

// કેમેરા ચાલુ કરો
export async function startCamera() {
  const video = $("cameraPreview");

  if (!video) {
    showMessage("કેમેરાની જગ્યા મળી નથી.");
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    showMessage("આ બ્રાઉઝરમાં કેમેરા સપોર્ટ નથી.");
    return;
  }

  if (!window.isSecureContext) {
    showMessage("કેમેરા માટે HTTPS જરૂરી છે.");
    return;
  }

  try {
    stopCamera();

    showMessage("કેમેરાની પરવાનગી માંગી રહ્યા છીએ...");

    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" }
      },
      audio: false
    });

    video.srcObject = cameraStream;
    video.playsInline = true;

    await video.play();

    showMessage("કેમેરા ચાલુ છે. હવે ફોટો લઈ શકો છો.");
  } catch (error) {
    console.error("Camera error:", error);

    if (error.name === "NotAllowedError") {
      showMessage("કેમેરાની પરવાનગી આપવામાં આવી નથી.");
    } else if (error.name === "NotFoundError") {
      showMessage("કેમેરા મળ્યો નથી.");
    } else {
      showMessage("કેમેરા ચાલુ થઈ શક્યો નથી: " + error.message);
    }
  }
}

// કેમેરા બંધ કરો
export function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }

  const video = $("cameraPreview");

  if (video) {
    video.pause();
    video.srcObject = null;
  }
}

// ફોટો લો
export function capturePhoto() {
  const video = $("cameraPreview");
  const canvas = getCanvas();

  if (!video || !canvas || !video.videoWidth) {
    showMessage("પહેલાં કેમેરો ચાલુ કરો.");
    return null;
  }

  const maxWidth = 1600;
  const scale = Math.min(1, maxWidth / video.videoWidth);

  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);

  const context = canvas.getContext("2d");

  if (!context) {
    showMessage("ફોટો તૈયાર કરી શકાયો નથી.");
    return null;
  }

  context.drawImage(
    video,
    0,
    0,
    canvas.width,
    canvas.height
  );

  currentImage = canvas;

  showMessage("ફોટો સફળતાપૂર્વક લેવામાં આવ્યો.");

  return currentImage;
}

// ગેલેરીમાંથી ફોટો પસંદ કરો
export function loadGallery(file) {
  if (!file) {
    showMessage("કોઈ ફોટો પસંદ કર્યો નથી.");
    return;
  }

  if (!file.type.startsWith("image/")) {
    showMessage("કૃપા કરીને ફોટો ફાઇલ પસંદ કરો.");
    return;
  }

  if (file.size > 15 * 1024 * 1024) {
    showMessage("ફોટો 15 MB કરતાં નાનો પસંદ કરો.");
    return;
  }

  const canvas = getCanvas();

  if (!canvas) {
    showMessage("ફોટો બતાવવાની જગ્યા મળી નથી.");
    return;
  }

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  image.onload = () => {
    try {
      const maxWidth = 1600;
      const scale = Math.min(1, maxWidth / image.width);

      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);

      const context = canvas.getContext("2d");

      if (!context) {
        showMessage("ફોટો લોડ થઈ શક્યો નથી.");
        return;
      }

      context.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      );

      currentImage = canvas;

      showMessage("ગેલેરીનો ફોટો તૈયાર છે.");
    } catch (error) {
      console.error(error);
      showMessage("ફોટો લોડ કરવામાં સમસ્યા આવી.");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    showMessage("આ ફોટો ખોલી શકાયો નથી.");
  };

  image.src = objectUrl;
}
