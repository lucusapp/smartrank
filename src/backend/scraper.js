//const puppeteer = require("puppeteer");

// async function scrapeWallapop(mobileModel) {
//   const browser = await puppeteer.launch({ headless: true });
//   const page = await browser.newPage();

//   try {
//     await page.goto(`https://es.wallapop.com/search?kws=${mobileModel}`, {
//       waitUntil: "networkidle2",
//     });

//     // Espera a que se cargue al menos un elemento de producto
//     await page.waitForSelector(".ItemCardList__item", { timeout: 60000 });

//     // Extrae la información de cada producto
//     const items = await page.evaluate(() => {
//       const productElements = document.querySelectorAll(".ItemCardList__item");
//       const products = [];

//       productElements.forEach((product) => {
//         const title = product.getAttribute("title");
//         const productUrl = product.href;
//         const imageUrl = product.querySelector(".ItemCard__image img")?.src;

//         products.push({
//           title,
//           productUrl,
//           imageUrl,
//         });
//       });

//       return products;
//     });

//     await browser.close();
//     return items;

//   } catch (error) {
//     console.error("Error scraping Wallapop:", error);
//     await browser.close();
//     throw error;
//   }
// }



import puppeteer from "puppeteer";
import { scrapeProductDetails, processScrapedData } from "./services/scraper.js";

async function scrapeWallapopMain(model) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    const searchUrl = `https://es.wallapop.com/app/search?filters_source=search_box&keywords=${encodeURIComponent(model)}`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".ItemCardList__item");

    const productLinks = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a.ItemCardList__item")).map((item) => item.href)
    );
    console.log("Productos encontrados:", productLinks);

    const detailedProducts = [];
    for (const link of productLinks) {
      try {
        const details = await scrapeProductDetails(link);
        detailedProducts.push({ url: link, ...details });
      } catch (error) {
        console.error(`Error scraping product details for ${link}:`, error);
      }
    }

    // Procesa todos los productos al final
    await processScrapedData(detailedProducts);

    return detailedProducts;
  } catch (error) {
    console.error("Error scraping Wallapop listings:", error);
    return [];
  } finally {
    await browser.close();
  }
}

export default scrapeWallapopMain;


