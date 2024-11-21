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
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
      console.log(`Navegando a la URL: ${productUrl}`);
      await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

      const productDetails = await page.evaluate(() => {
          const getDetailValue = (labelText) => {
              const label = Array.from(document.querySelectorAll(".item-detail-characteristics-details_CharacteristicsDetails__attribute__Gzko0"))
                  .find((el) => el.textContent.trim() === labelText);
              return label?.nextElementSibling?.textContent.trim() || "";
          };

          const estado = getDetailValue("Estado");
          const marca = getDetailValue("Marca");
          const modelo = getDetailValue("Modelo");
          const color = getDetailValue("Color");
          const capacidad = getDetailValue("Capacidad de almacenamiento");

          const descripcion = document.querySelector(".item-detail_ItemDetail__description__7rXXT")?.textContent.trim() || "";

          return { estado, marca, modelo, color, capacidad, descripcion };
      });

      console.log("Datos del producto extraídos:", productDetails);
      await browser.close();
      return productDetails;

  } catch (error) {
      console.error(`Error scrapeando los detalles del producto en ${productUrl}:`, error);
      await browser.close();
      return null;
  }
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
