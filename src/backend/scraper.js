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
  if (!model || typeof model !== "string") {
    throw new Error("Modelo inválido. Por favor, proporciona un modelo válido para el scraping.");
  }

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    const searchUrl = `https://es.wallapop.com/app/search?filters_source=search_box&keywords=${encodeURIComponent(model)}`;
    console.log(`Iniciando scraping para el modelo: ${model}`);
    console.log(`Navegando a la URL: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".ItemCardList__item");

    // Extraer URLs de productos
    const productLinks = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a.ItemCardList__item")).map((item) => item.href)
    );
    console.log("Productos encontrados:", productLinks);

    // Extraer detalles de cada producto
    const detailedProducts = [];
    for (const link of productLinks) {
      try {
        const details = await scrapeProductDetails(link);
        detailedProducts.push({ url: link, ...details });
      } catch (error) {
        console.error(`Error extrayendo detalles para ${link}:`, error);
      }
    }

    // Procesar y guardar los productos
    await processScrapedData(detailedProducts, model); // Pasar el modelo para usarlo como nombre de colección

    console.log("Scraping completado con éxito.");
    return detailedProducts;
  } catch (error) {
    console.error("Error general en el scraping de Wallapop:", error);
    return [];
  } finally {
    await browser.close();
  }
}

// Wrapper principal para manejar la ejecución
(async () => {
  const args = process.argv.slice(2);
  const model = args[0]; // Recoge el modelo desde los argumentos
  if (!model) {
    console.error("Por favor, proporciona un modelo para el scraping. Ejemplo: node scraper.js 'oppo a53s'");
    process.exit(1);
  }

  try {
    await scrapeWallapopMain(model);
  } catch (error) {
    console.error("Error ejecutando el scraper:", error);
    process.exit(1);
  }
})();



