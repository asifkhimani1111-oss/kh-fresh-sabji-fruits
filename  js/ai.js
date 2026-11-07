

const $ = id => document.getElementById(id);

let compatibility = null;

function setMessage(message) {
  const element = $("aiCompatibility");

  if (element) {
    element.textContent = message;
  }
}

// AI ચલાવવાની ક્ષમતા તપાસો
export async function checkAICompatibility() {
  const cores = navigator.hardwareConcurrency || 0;
  const memory = navigator.deviceMemory || 0;

  let gpuAvailable = false;
  let gpuMessage = "WebGPU ઉપલબ્ધ નથી";

  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();

      if (adapter) {
        gpuAvailable = true;
        gpuMessage = "WebGPU ઉપલબ્ધ છે";
      }
    } catch (error) {
      gpuMessage = "GPU તપાસી શકાયું નથી";
    }
  }

  let storageAvailable = false;
  let storageMessage = "સ્ટોરેજ માહિતી ઉપલબ્ધ નથી";

  if (navigator.storage?.estimate) {
    try {
      const storage = await navigator.storage.estimate();

      const freeBytes =
        (storage.quota || 0) - (storage.usage || 0);

      storageAvailable = freeBytes > 500 * 1024 * 1024;

      storageMessage =
        "અંદાજિત ખાલી જગ્યા: " +
        (freeBytes / (1024 * 1024)).toFixed(0) +
        " MB";
    } catch (error) {
      storageMessage = "સ્ટોરેજ તપાસી શકાયું નથી";
    }
  }

  // બ્રાઉઝર દ્વારા મળેલી અંદાજિત માહિતી
  let level = "મર્યાદિત";

  if (memory >= 8 && cores >= 8 && gpuAvailable) {
    level = "સારી ક્ષમતા";
  } else if (memory >= 4 && cores >= 4) {
    level = "મધ્યમ ક્ષમતા";
  }

  const report = [
    "AYAN LOCAL AI COMPATIBILITY",
    "----------------------------",
    "પ્રોસેસર કોર: " + (cores || "અજ્ઞાત"),
    "અંદાજિત RAM: " + (memory ? memory + " GB" : "અજ્ઞાત"),
    "GPU: " + gpuMessage,
    "સ્ટોરેજ: " + storageMessage,
    "AI ક્ષમતા: " + level,
    "",
    "હાલમાં સ્થાનિક Generative AI મોડેલ જોડાયેલું નથી.",
    "આ તપાસ AI ચલાવવાની ખાતરી આપતી નથી.",
    "મોડેલનું કદ, બ્રાઉઝર અને ફોનની ક્ષમતા પ્રમાણે પરિણામ બદલાશે."
  ];

  compatibility = {
    cores,
    memory,
    gpuAvailable,
    gpuMessage,
    storageAvailable,
    storageMessage,
    level
  };

  setMessage(report.join("\n"));

  console.log(report.join("\n"));

  return compatibility;
}

// બીજી ફાઇલો માટે ક્ષમતા મેળવો
export function getAICompatibility() {
  return compatibility;
}

// AI ઉપલબ્ધ છે કે નહીં
export function isLocalAIReady() {
  return false;
}
