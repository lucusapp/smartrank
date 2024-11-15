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
  await page.goto(productUrl, { waitUntil: "domcontentloaded" });
  const html = await page.content();
  console.log(html);

  const productDetails = await page.evaluate(() => {
    const estado = document.querySelector("[class*='CharacteristicsDetails__attribute']:nth-of-type(1)")?.nextElementSibling?.innerText || "";
    const marca = document.querySelector("[class*='CharacteristicsDetails__attribute']:nth-of-type(2)")?.nextElementSibling?.innerText || "";
    const modelo = document.querySelector("[class*='CharacteristicsDetails__attribute']:nth-of-type(3)")?.nextElementSibling?.innerText || "";
    const color = document.querySelector("[class*='CharacteristicsDetails__attribute']:nth-of-type(4)")?.nextElementSibling?.innerText || "";
    const capacidad = document.querySelector("[class*='CharacteristicsDetails__attribute']:nth-of-type(5)")?.nextElementSibling?.innerText || "";
    const descripcion = document.querySelector(".item-detail_ItemDetail__description")?.innerText || "";
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

  return products;
}

module.exports = { scrapeWallapop, scrapeProductDetails };
