

import { currentImage } from "./camera.js";

const $ = id => document.getElementById(id);

let workerPromise = null;
let isReading = false;

function showStatus(message) {
  const ids = ["ocrStatus", "ocrResult", "systemMessage"];

  for (const id of ids) {
    const element = $(id);

    if (element) {
      element.textContent = message;
      break;
    }
  }
}

function showText(text) {
  const ids = ["ocrText", "ocrOutput", "recognizedText"];

  for (const id of ids) {
    const element = $(id);

    if (element) {
      element.value !== undefined
        ? element.value = text
        : element.textContent = text;

      return;
    }
  }

  const result = $("ocrResult");

  if (result) {
    result.textContent = text;
  }
}

// Tesseract.js લાઇબ્રેરી લોડ કરો
async function getWorker() {
  if (workerPromise) {
    return workerPromise;
  }

  workerPromise = (async () => {
    const Tesseract = await import(
      "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js"
    );

    return await Tesseract.createWorker("eng", 1, {
      logger: message => {
        if (message.status === "recognizing text") {
          const progress = Math.round(
            (message.progress || 0) * 100
          );

          showStatus("ફોટો વાંચી રહ્યા છીએ... " + progress + "%");
        } else if (message.status === "loading language traineddata") {
          showStatus("અંગ્રેજી ભાષાનું મોડેલ ડાઉનલોડ થઈ રહ્યું છે...");
        } else if (message.status === "loading tesseract core") {
          showStatus("OCR સિસ્ટમ તૈયાર થઈ રહી છે...");
        }
      }
    });
  })();

  try {
    return await workerPromise;
  } catch (error) {
    workerPromise = null;
    throw error;
  }
}

// ફોટામાંથી લખાણ વાંચો
export async function readText() {
  if (isReading) {
    showStatus("ફોટો પહેલેથી વાંચવામાં આવી રહ્યો છે.");
    return;
  }

  if (!currentImage) {
    showStatus("પહેલાં કેમેરાથી ફોટો લો અથવા ગેલેરીમાંથી પસંદ કરો.");
    return;
  }

  if (!navigator.onLine) {
    showStatus("OCR મોડેલ લોડ કરવા માટે ઇન્ટરનેટ જરૂરી છે.");
    return;
  }

  isReading = true;

  try {
    showStatus("OCR શરૂ થઈ રહ્યું છે...");

    const worker = await getWorker();

    showStatus("ફોટામાંથી લખાણ વાંચી રહ્યા છીએ...");

    const result = await worker.recognize(currentImage);

    const text = result.data.text.trim();

    if (!text) {
      showText("");
      showStatus("ફોટામાં વાંચી શકાય એવું લખાણ મળ્યું નથી.");
      return;
    }

    showText(text);
    showStatus("ફોટાનું લખાણ સફળતાપૂર્વક વાંચી લીધું.");

    console.log("AYAN OCR Result:", text);

    return text;

  } catch (error) {
    console.error("OCR Error:", error);

    showStatus(
      "લખાણ વાંચવામાં સમસ્યા આવી. ઇન્ટરનેટ અને ફોટો તપાસો."
    );

    return null;

  } finally {
    isReading = false;
  }
}
