import { classics } from "./classics.js";

export function getRecommendation(random = Math.random, previousId) {
  const alternatives = previousId === undefined
    ? classics
    : classics.filter((classic) => classic.id !== previousId);
  const candidates = alternatives.length > 0 ? alternatives : classics;
  return candidates[Math.floor(random() * candidates.length)];
}
