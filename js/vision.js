

import { currentImage } from "./camera.js";

const $ = id => document.getElementById(id);

let modelPromise = null;
let detecting = false;

function showStatus(message) {
  const element =
    $("visionResult") ||
    $("systemMessage");

  if (element) {
    element.textContent = message;
  }
}

function loadTensorFlow() {
  if (!window.tf) {
    return import(
      "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js"
    ).then(() => {
      return window.tf;
    });
  }

  return Promise.resolve(window.tf);
}

async function loadModel() {
  if (modelPromise) {
    return modelPromise;
  }

  modelPromise = (async () => {
    await loadTensorFlow();

    const coco = await import(
      "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js"
    );

    return await coco.load({
      base: "lite_mobilenet_v2"
    });
  })();

  try {
    return await modelPromise;
  } catch (error) {
    modelPromise = null;
    throw error;
  }
}

// ફોટામાં વસ્તુઓ ઓળખો
export async function detectObjects() {
  if (detecting) {
    showStatus("વસ્તુઓ પહેલેથી ઓળખાઈ રહી છે.");
    return;
  }

  if (!currentImage) {
    showStatus("પહેલાં કેમેરાથી ફોટો લો અથવા ગેલેરીમાંથી પસંદ કરો.");
    return;
  }

  if (!navigator.onLine && !modelPromise) {
    showStatus("પહેલી વાર મોડેલ લોડ કરવા માટે ઇન્ટરનેટ જરૂરી છે.");
    return;
  }

  detecting = true;

  try {
    showStatus("વસ્તુ ઓળખવાનું મોડેલ તૈયાર થઈ રહ્યું છે...");

    const model = await loadModel();

    showStatus("ફોટામાં વસ્તુઓ શોધી રહ્યા છીએ...");

    const predictions = await model.detect(currentImage);

    if (!predictions.length) {
      showStatus("ફોટામાં ઓળખી શકાય તેવી વસ્તુ મળી નથી.");
      return [];
    }

    const results = predictions
      .sort((a, b) => b.score - a.score)
      .map((item, index) => {
        const confidence = Math.round(item.score * 100);

        return (
          (index + 1) + ". " +
          item.class +
          " — " + confidence + "%"
        );
      });

    const output = results.join("\n");

    const element =
      $("visionResult") ||
      $("objectResult");

    if (element) {
      element.textContent =
        "ઓળખાયેલી વસ્તુઓ:\n" + output;
    }

    console.log("AYAN Object Detection:", predictions);

    return predictions;

  } catch (error) {
    console.error("Vision Error:", error);

    showStatus(
      "વસ્તુઓ ઓળખવામાં સમસ્યા આવી. ઇન્ટરનેટ અથવા મોડેલ તપાસો."
    );

    return null;

  } finally {
    detecting = false;
  }
}