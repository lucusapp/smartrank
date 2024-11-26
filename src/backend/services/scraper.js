// backend/services/scraper.js
import puppeteer from "puppeteer";
import { updateArticle }   from "./articleTracker.js";
import { saveScrapedProduct } from "./firestoreService.js";



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

      // Obtener ID del artículo desde la URL
      const urlParts = productUrl.split("/");
      const articleId = urlParts[urlParts.length - 1]; // Extrae el ID de la URL

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
          const editado = document.querySelector(".item-detail-stats_ItemDetailStats__description__vjz96")?.innerText || "";
          const vistas = document.querySelector(".item-detail-stats_ItemDetailStats__counters__ZFOFk [aria-label='Views']")?.innerText || "0";
          const meGustas = document.querySelector(".item-detail-stats_ItemDetailStats__counters__ZFOFk [aria-label='Favorites']")?.innerText || "0";

          const descripcion = document.querySelector(".item-detail_ItemDetail__description__7rXXT")?.textContent.trim() || "";

          return { estado, marca, modelo, color, capacidad, descripcion, editado, vistas, meGustas };
      });

      // Agregar el ID único al producto
      const product = { id: articleId, ...productDetails };

      console.log("Datos del producto extraídos:", product);
      await browser.close();
      return product;

  } catch (error) {
      console.error(`Error scrapeando los detalles del producto en ${productUrl}:`, error);
      await browser.close();
      return null;
  }
}







async function scrapeWallapopListings(modelUrl) {
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

  console.log("Scraping completado para URLs:", modelUrl);
  return products;
}

async function processScrapedData(products) {
  for (const product of products) {
    // Ajusta los datos a tu esquema
    const productData = {
      id: product.id || 0, // Extraído de la URL o el scraping
      name: product.name || "Desconocido",
      description: product.description || "Sin descripción",
      lastEdited: product.lastEdited || null,
      views: product.views || 0,
      favorites: product.favorites || 0,
    };

  

    // Guardar en Firestore
    await saveScrapedProduct(productData);
  }
}



export { scrapeWallapopListings, scrapeProductDetails, processScrapedData };
