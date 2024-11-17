// backend/services/scraper.js
const puppeteer = require("puppeteer");



async function scrapeListing(listingUrl) {
  

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(listingUrl, { waitUntil: "domcontentloaded" });

  const productUrls = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".ItemCard a"))
      .map((el) => el.href)
      .filter((url) => url.includes("/item/"));
  });

  await browser.close();
  return productUrls;
}

async function scrapeProductDetails(productUrl) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  console.log("Navegando a URL:", productUrl);
  if (!productUrl || !productUrl.startsWith("http")) {
    throw new Error("URL no válida: " + productUrl);
  }
  await page.goto(productUrl, { waitUntil: "domcontentloaded" });





  await page.goto(productUrl, { waitUntil: "domcontentloaded" });

  const productDetails = await page.evaluate(() => {
    const estado = document.querySelector(".row.mb-2:nth-of-type(1) .item-detail-characteristics-details_CharacteristicsDetails__value__0pdJu")?.innerText || "";
    const marca = document.querySelector(".row.mb-2:nth-of-type(2) .item-detail-characteristics-details_CharacteristicsDetails__value__0pdJu")?.innerText || "";
    const modelo = document.querySelector(".row.mb-2:nth-of-type(3) .item-detail-characteristics-details_CharacteristicsDetails__value__0pdJu")?.innerText || "";
    const color = document.querySelector(".row.mb-2:nth-of-type(4) .item-detail-characteristics-details_CharacteristicsDetails__value__0pdJu")?.innerText || "";
    const capacidad = document.querySelector(".row.mb-2:nth-of-type(5) .item-detail-characteristics-details_CharacteristicsDetails__value__0pdJu")?.innerText || "";
    const descripcion = document.querySelector(".item-detail_ItemDetail__description__7rXXT")?.innerText || ""; // Ajustar si es dinámico
    return { estado, marca, modelo, color, capacidad, descripcion };
  });

  await browser.close();
  return productDetails;
}

async function scrapeWallapop(modelUrl) {
  const productUrls = await scrapeListing(modelUrl);

  const products = [];
  for (const url of productUrls) {
    try {
      const details = await scrapeProductDetails(url);
      products.push(details);
    } catch (error) {
      console.error(`Error scraping product at ${url}:`, error);
    }
  }
  console.log("URL generada para el scraping:", productUrl);

  return products;
}

module.exports = { scrapeWallapop, scrapeProductDetails };
