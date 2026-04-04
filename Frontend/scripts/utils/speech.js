export function hasSpeechSynthesis() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function speakText(text, language = "en-IN") {
  if (!hasSpeechSynthesis()) return false;
  const cleanText = String(text || "").trim();
  if (!cleanText) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = language || "en-IN";
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeech() {
  if (hasSpeechSynthesis()) window.speechSynthesis.cancel();
}
