// src/backend/testScraper.js
const { scrapeProductDetails } = require("./services/scraper");

async function test() {
  const url = "https://es.wallapop.com/search?kws=oppo+a52s"; // Asegúrate de que esta URL devuelva productos relevantes
  try {
    const result = await scrapeProductDetails(url);
    console.log("Resultados de scrapeo:", result);
  } catch (error) {
    console.error("Error en el test de scrapeo:", error);
  }
}

test();
