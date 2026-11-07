

const $ = id => document.getElementById(id);

let recognition = null;
let listening = false;

function showVoiceMessage(message) {
  const output = $("voiceResult");
  if (output) output.textContent = message;
}

// માઇક્રોફોનથી અવાજ સાંભળો
export function startListening() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    showVoiceMessage(
      "આ બ્રાઉઝરમાં અવાજ ઓળખવાની સુવિધા ઉપલબ્ધ નથી."
    );
    return;
  }

  if (listening) {
    showVoiceMessage("માઇક્રોફોન પહેલેથી ચાલુ છે.");
    return;
  }

  const languageSelect = $("languageSelect");
  const language = languageSelect?.value || "gu-IN";

  recognition = new SpeechRecognition();

  recognition.lang = language;
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    listening = true;
    showVoiceMessage("સાંભળી રહ્યો છું... બોલો.");
  };

  recognition.onresult = event => {
    let finalText = "";
    let temporaryText = "";

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {
      const result = event.results[i];

      if (result.isFinal) {
        finalText += result[0].transcript;
      } else {
        temporaryText += result[0].transcript;
      }
    }

    const text = finalText || temporaryText;

    const input = $("userInput");

    if (input && text) {
      input.value = text;
    }

    showVoiceMessage(
      finalText
        ? "અવાજ ઓળખાયો: " + finalText
        : "સાંભળી રહ્યો છું: " + temporaryText
    );
  };

  recognition.onerror = event => {
    listening = false;

    const messages = {
      "not-allowed": "માઇક્રોફોનની પરવાનગી આપો.",
      "no-speech": "અવાજ સંભળાયો નથી. ફરી પ્રયાસ કરો.",
      "network": "અવાજ ઓળખવા માટે નેટવર્કની સમસ્યા છે.",
      "audio-capture": "માઇક્રોફોન મળ્યો નથી."
    };

    showVoiceMessage(
      messages[event.error] ||
      "અવાજ ઓળખવામાં સમસ્યા આવી: " + event.error
    );
  };

  recognition.onend = () => {
    listening = false;
    recognition = null;
  };

  try {
    recognition.start();
  } catch (error) {
    listening = false;
    showVoiceMessage("માઇક્રોફોન શરૂ થઈ શક્યો નથી.");
  }
}

// માઇક્રોફોન બંધ કરો
export function stopListening() {
  if (recognition) {
    recognition.stop();
  }

  listening = false;
  showVoiceMessage("માઇક્રોફોન બંધ છે.");
}

// લખાણને અવાજમાં બોલો
export function speakText(text) {
  if (!("speechSynthesis" in window)) {
    showVoiceMessage(
      "આ બ્રાઉઝરમાં બોલવાની સુવિધા ઉપલબ્ધ નથી."
    );
    return;
  }

  if (!text || !String(text).trim()) {
    showVoiceMessage("બોલવા માટે લખાણ આપો.");
    return;
  }

  window.speechSynthesis.cancel();

  const languageSelect = $("languageSelect");
  const language = languageSelect?.value || "gu-IN";

  const utterance = new SpeechSynthesisUtterance(
    String(text)
  );

  utterance.lang = language;
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;

  utterance.onstart = () => {
    showVoiceMessage("AYAN બોલી રહ્યું છે...");
  };

  utterance.onend = () => {
    showVoiceMessage("બોલવાનું પૂર્ણ થયું.");
  };

  utterance.onerror = () => {
    showVoiceMessage("અવાજ વગાડી શકાયો નથી.");
  };

  window.speechSynthesis.speak(utterance);
}

// બોલવાનું બંધ કરો
export function stopSpeaking() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  showVoiceMessage("અવાજ બંધ કર્યો.");
}