import { getRecommendation } from "./recommendation.js";

export function initWeb(document, random = Math.random) {
  const title = document.getElementById("classic-title");
  const author = document.getElementById("classic-author");
  const paragraph = document.getElementById("classic-paragraph");
  const wit = document.getElementById("classic-wit");
  const button = document.getElementById("next-recommendation");
  let location;
  let link;
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
  }
  const viewedIds = new Set();
  let previousId;

  function renderRecommendation() {
    const recommendation = getRecommendation(random, previousId, viewedIds);
    title.textContent = recommendation.title;
    author.textContent = recommendation.author;
    paragraph.textContent = recommendation.paragraph;
    paragraph.lang = recommendation.source.language;
    wit.textContent = recommendation.wit;
    if (location && link) {
      location.textContent = recommendation.source.location;
      link.href = recommendation.source.url;
    }
    previousId = recommendation.id;
    viewedIds.add(recommendation.id);
  }

  renderRecommendation();
  button.addEventListener("click", renderRecommendation);
  button.disabled = false;
}

if (typeof document !== "undefined") {
  initWeb(document);
}
