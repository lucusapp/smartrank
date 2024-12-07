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
import fs from "fs/promises";

async function readProductList(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const productNames = fileContent.split("\n").map((line) => line.trim()).filter((line) => line);
    console.log(`Leídas ${productNames.length} líneas desde ${filePath}`);
    return productNames;
  } catch (error) {
    console.error(`Error al leer el archivo ${filePath}:`, error);
    throw error;
  }
}

async function scrapeWallapopForProduct(model) {
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

    console.log(`Scraping completado con éxito para el modelo: ${model}.`);
    return detailedProducts;
  } catch (error) {
    console.error(`Error general en el scraping del modelo "${model}":`, error);
    return [];
  } finally {
    await browser.close();
  }
}

(async () => {
  const filePath = "./product-list.txt"; // Ruta al archivo con los nombres de productos
  try {
    const productNames = await readProductList(filePath);
    if (productNames.length === 0) {
      console.error("No se encontraron productos en la lista.");
      process.exit(1);
    }

    for (const model of productNames) {
      console.log(`Procesando modelo: ${model}`);
      try {
        await scrapeWallapopForProduct(model);
      } catch (error) {
        console.error(`Error procesando el modelo "${model}":`, error);
      }
    }

    console.log("Scraping completado para todos los productos en la lista.");
  } catch (error) {
    console.error("Error general al ejecutar el scraper:", error);
    process.exit(1);
  }
})();



