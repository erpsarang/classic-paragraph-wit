import { pathToFileURL } from "node:url";
import { classics } from "./classics.js";

export function getAppStatus() {
  return {
    status: "READY",
    purpose: "유명한 고전의 한 문단을 추천하고 짤막한 인생의 위트를 전한다.",
  };
}

export function getRecommendation(random = Math.random) {
  return classics[Math.floor(random() * classics.length)];
}

export function runApp() {
  const recommendation = getRecommendation();
  console.log([
    `작품명: ${recommendation.title}`,
    `저자: ${recommendation.author}`,
    `추천 문단: ${recommendation.paragraph}`,
    `위트: ${recommendation.wit}`,
  ].join("\n\n"));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runApp();
}
