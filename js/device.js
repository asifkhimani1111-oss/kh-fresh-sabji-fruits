
const $ = id => document.getElementById(id);

function setText(id, text) {
  const element = $(id);
  if (element) element.textContent = text;
}

function setConnection(online) {
  const dot = $("internetDot");

  setText(
    "internetStatus",
    online ? "ઇન્ટરનેટ ચાલુ છે" : "ઇન્ટરનેટ બંધ છે"
  );

  if (dot) {
    dot.className = online ? "dot online" : "dot offline";
  }

  setText(
    "networkInfo",
    online ? "Connected" : "Offline"
  );
}

export function updateNetwork() {
  setConnection(navigator.onLine);

  setText(
    "offlineStatus",
    navigator.onLine
      ? "ઇન્ટરનેટ ઉપલબ્ધ છે. ઑનલાઇન અને ઑફલાઇન બંને સુવિધાઓ માટે તૈયાર."
      : "ઇન્ટરનેટ બંધ છે. ઉપલબ્ધ ઑફલાઇન સુવિધાઓ ચાલુ રહેશે."
  );
}

export async function checkDevice() {
  setText("systemMessage", "મોબાઇલની ક્ષમતા તપાસી રહ્યા છીએ...");

  // Processor information
  const cores = navigator.hardwareConcurrency || null;

  setText(
    "cpuInfo",
    cores ? cores + " CPU Cores (અંદાજ)" : "માહિતી ઉપલબ્ધ નથી"
  );

  // Device memory (browser estimate)
  const memory = navigator.deviceMemory || null;

  setText(
    "memoryInfo",
    memory ? memory + " GB (અંદાજ)" : "માહિતી ઉપલબ્ધ નથી"
  );

  // Browser information
  const ua = navigator.userAgent || "Unknown";

  let browser = "અન્ય બ્રાઉઝર";

  if (/Edg/i.test(ua)) browser = "Microsoft Edge";
  else if (/Chrome/i.test(ua)) browser = "Google Chrome";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Safari/i.test(ua)) browser = "Safari";

  setText("browserInfo", browser);

  // Internet status
  updateNetwork();

  // Storage information
  let storageText = "માહિતી ઉપલબ્ધ નથી";

  if (navigator.storage && navigator.storage.estimate) {
    try {
      const info = await navigator.storage.estimate();

      const usedMB = info.usage
        ? (info.usage / (1024 * 1024)).toFixed(1)
        : "0";

      const totalMB = info.quota
        ? (info.quota / (1024 * 1024)).toFixed(1)
        : "અજ્ઞાત";

      storageText =
        "વપરાશ " + usedMB + " MB / અંદાજિત મર્યાદા " +
        totalMB + " MB";
    } catch (error) {
      storageText = "સ્ટોરેજ તપાસી શકાયું નથી";
    }
  }

  // Camera support
  const cameraSupported =
    !!(navigator.mediaDevices &&
       navigator.mediaDevices.getUserMedia);

  // Microphone support
  const micSupported =
    !!(navigator.mediaDevices &&
       navigator.mediaDevices.getUserMedia);

  // Speaker support
  const speakerSupported =
    "speechSynthesis" in window;

  // Voice recognition support
  const voiceRecognitionSupported =
    !!(window.SpeechRecognition ||
       window.webkitSpeechRecognition);

  // GPU support
  let gpuStatus = "માહિતી ઉપલબ્ધ નથી";

  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();

      gpuStatus = adapter
        ? "WebGPU ઉપલબ્ધ"
        : "WebGPU ઉપલબ્ધ નથી";
    } catch (error) {
      gpuStatus = "WebGPU તપાસી શકાયું નથી";
    }
  } else {
    gpuStatus = "WebGPU સપોર્ટ નથી";
  }

  // Secure connection
  const secure = window.isSecureContext;

  const report = [
    "AYAN DEVICE REPORT",
    "------------------------",
    "પ્રોસેસર: " + (cores || "અજ્ઞાત"),
    "મેમરી: " + (memory ? memory + " GB" : "અજ્ઞાત"),
    "સ્ટોરેજ: " + storageText,
    "બ્રાઉઝર: " + browser,
    "ઇન્ટરનેટ: " + (navigator.onLine ? "ચાલુ" : "બંધ"),
    "કેમેરા API: " + (cameraSupported ? "ઉપલબ્ધ" : "ઉપલબ્ધ નથી"),
    "માઇક્રોફોન API: " + (micSupported ? "ઉપલબ્ધ" : "ઉપલબ્ધ નથી"),
    "સ્પીકર: " + (speakerSupported ? "ઉપલબ્ધ" : "ઉપલબ્ધ નથી"),
    "અવાજ ઓળખ: " + (voiceRecognitionSupported ? "ઉપલબ્ધ" : "ઉપલબ્ધ નથી"),
    "GPU: " + gpuStatus,
    "સુરક્ષિત HTTPS: " + (secure ? "હા" : "ના")
  ];

  setText("systemMessage", "મોબાઇલની તપાસ પૂર્ણ થઈ.");

  const reportElement = $("aiCompatibility");

  if (reportElement) {
    reportElement.textContent =
      report.join("\n") +
      "\n\nઆ માહિતી બ્રાઉઝર દ્વારા મળેલો અંદાજ છે. તે હાર્ડવેરની સંપૂર્ણ તપાસ નથી.";
  }

  console.log(report.join("\n"));

  return {
    cores,
    memory,
    storageText,
    browser,
    cameraSupported,
    micSupported,
    speakerSupported,
    voiceRecognitionSupported,
    gpuStatus,
    secure,
    online: navigator.onLine
  };
}
