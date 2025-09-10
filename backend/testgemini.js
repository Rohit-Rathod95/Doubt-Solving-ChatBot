import { askGemini } from "./gemini.js";

(async () => {
  const answer = await askGemini("Solve x^2 - 5x + 6 = 0");
  console.log("Gemini Response:", answer);
})();
