import { getRecommendation } from "./recommendation.js";

export function initWeb(document, random = Math.random) {
  const title = document.getElementById("classic-title");
  const author = document.getElementById("classic-author");
  const paragraph = document.getElementById("classic-paragraph");
  const wit = document.getElementById("classic-wit");
  const button = document.getElementById("next-recommendation");
  let previousId;

  function renderRecommendation() {
    const recommendation = getRecommendation(random, previousId);
    title.textContent = recommendation.title;
    author.textContent = recommendation.author;
    paragraph.textContent = recommendation.paragraph;
    paragraph.lang = recommendation.source.language;
    wit.textContent = recommendation.wit;
    previousId = recommendation.id;
  }

  renderRecommendation();
  button.addEventListener("click", renderRecommendation);
  button.disabled = false;
}

if (typeof document !== "undefined") {
  initWeb(document);
}
