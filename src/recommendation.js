import { classics } from "./classics.js";

export function getRecommendation(random = Math.random, previousId, viewedIds) {
  const alternatives = previousId === undefined
    ? classics
    : classics.filter((classic) => classic.id !== previousId);
  const available = alternatives.length > 0 ? alternatives : classics;
  const unread = viewedIds === undefined
    ? []
    : available.filter((classic) => !viewedIds.has(classic.id));
  const candidates = unread.length > 0 ? unread : available;
  return candidates[Math.floor(random() * candidates.length)];
}
