import { getRecommendation } from "./recommendation.js";

export function initWeb(document, random = Math.random) {
  const title = document.getElementById("classic-title");
  const author = document.getElementById("classic-author");
  const paragraph = document.getElementById("classic-paragraph");
  const wit = document.getElementById("classic-wit");
  const button = document.getElementById("next-recommendation");
  let location;
  let link;
  let previousButton;
  if (typeof document.createElement === "function") {
    const source = document.createElement("div");
    source.id = "classic-source";
    location = document.createElement("p");
    location.id = "classic-source-location";
    link = document.createElement("a");
    link.id = "classic-source-link";
    link.textContent = "영어 원문 읽기 · Project Gutenberg";
    source.append(location, link);
    paragraph.insertAdjacentElement("afterend", source);

    previousButton = document.createElement("button");
    previousButton.id = "previous-recommendation";
    previousButton.type = "button";
    previousButton.textContent = "이전 추천";
    previousButton.setAttribute?.("aria-controls", "recommendation");
    previousButton.disabled = true;
    button.insertAdjacentElement("afterend", previousButton);
  }
  const viewedIds = new Set();
  const history = [];
  let currentIndex = -1;

  function renderRecommendation(recommendation) {
    title.textContent = recommendation.title;
    author.textContent = recommendation.author;
    paragraph.textContent = recommendation.paragraph;
    paragraph.lang = recommendation.source.language;
    wit.textContent = recommendation.wit;
    if (location && link) {
      location.textContent = recommendation.source.location;
      link.href = recommendation.source.url;
    }
    if (previousButton) previousButton.disabled = currentIndex <= 0;
  }

  function nextRecommendation() {
    if (currentIndex === history.length - 1) {
      const recommendation = getRecommendation(random, history[currentIndex]?.id, viewedIds);
      history.push(recommendation);
      viewedIds.add(recommendation.id);
    }
    currentIndex += 1;
    renderRecommendation(history[currentIndex]);
  }

  function previousRecommendation() {
    if (currentIndex <= 0) return;
    currentIndex -= 1;
    renderRecommendation(history[currentIndex]);
  }

  nextRecommendation();
  previousButton?.addEventListener("click", previousRecommendation);
  button.addEventListener("click", nextRecommendation);
  button.disabled = false;
}

if (typeof document !== "undefined") {
  initWeb(document);
}
