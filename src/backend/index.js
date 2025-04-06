import puppeteer from "puppeteer";
import fs from "fs/promises";
import { 
  saveOrUpdateProduct, 
  moveToTerminatedCollection,
  moveToPendingCollection,  
  getProcessedIds,
  updateProductHistory 
} from "./services/firestoreService.js";
import { scrapeProductDetails } from "./services/scraper.js";

// Leer la lista de productos desde un archivo
async function readProductList(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    return fileContent.split("\n").map(line => line.trim()).filter(Boolean);
  } catch (error) {
    console.error(`Error al leer el archivo ${filePath}:`, error);
    throw error;
  }
}

// Procesar productos existentes en Firebase
async function processExistingProducts(model, firebaseProducts) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  for (const productId of firebaseProducts) {
      try {
          console.log(`Verificando producto en Wallapop: ${productId}`);
          const productUrl = `https://es.wallapop.com/item/${productId}`;
          console.log(`Navegando a la URL: ${productUrl}`);

          await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

          // Scrapea los detalles del producto
          const details = await scrapeProductDetails(productUrl);

          // Detectar datos incompletos o scraping fallido
          if (!details) {
              console.warn(`Datos incompletos o scraping fallido para el producto ${productId}. Moviendo a 'pendientes'.`);
              // Mueve el producto con sus datos existentes a la colección "pendientes"
              await moveToPendingCollection(model, productId, { error: "Datos incompletos o scraping fallido" });
              continue;
          }

          // Verificar si el producto está reservado
          if (details.reservado) {
              console.log(`Producto ${productId} está reservado. Moviendo a 'terminados'.`);
              await moveToTerminatedCollection(productId, model);
              continue;
          }

          // Si los datos son válidos, verifica si es un producto nuevo
          const isNewProduct = await saveOrUpdateProduct(details, model);

          if (isNewProduct) {
              console.log(`Producto nuevo detectado: ${productId}. Registrando datos iniciales en history.`);
              const initialHistory = {
                  date: new Date().toISOString(),
                  changes: {
                      views: details.views || 0,
                      favorites: details.favorites || 0,
                      price: details.precio || 0,
                  },
              };
              await updateProductHistory(productId, model, initialHistory);
          } else {
              console.log(`Producto existente actualizado: ${productId}`);
          }

      } catch (error) {
          console.error(`Error procesando el producto ${productId}:`, error);
          console.log(`Producto ${productId} será movido a 'pendientes' debido al error.`);
          // Manejo de errores: Mueve el producto a "pendientes"
          await moveToPendingCollection(model, productId, { error: error.message });
      }
  }

  await browser.close();
}


// Scraping de nuevos productos en Wallapop
async function scrapeNewProducts(model, existingIds, page) {
  const searchUrl = `https://es.wallapop.com/app/search?filters_source=search_box&keywords=${encodeURIComponent(model)}`;
  console.log(`Buscando nuevos productos para el modelo: ${model}`);

  try {
    await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".ItemCardList__item", { timeout: 10000 });

    const productLinks = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a.ItemCardList__item")).map(link => link.href)
    );

    for (const link of productLinks) {
      const productId = link.split("/").pop();

      if (existingIds.has(productId)) {
        console.log(`Producto ya procesado: ${productId}. Omitiendo.`);
        continue;
      }

      try {
        const details = await scrapeProductDetails(link);
        if (details) {
          console.log(`Guardando nuevo producto: ${productId}`);
          await saveOrUpdateProduct(details, model);
        }
      } catch (error) {
        console.error(`Error scrapeando el producto en ${link}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error buscando nuevos productos para el modelo ${model}:`, error);
  }
}

(async () => {
  const filePath = "./src/backend/product-list.txt"


  try {
    const models = await readProductList(filePath);
    if (!models.length) {
      console.error("La lista de productos está vacía.");
      return;
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    for (const model of models) {
      console.log(`Iniciando proceso para el modelo: ${model}`);

      try {
        // Obtener IDs procesados de Firebase
        const firebaseProductIds = await getProcessedIds(model);

        if (!(firebaseProductIds instanceof Set)) {
          console.error(
            `Error: Se esperaba que getProcessedIds devolviera un Set, pero se recibió:`,
            firebaseProductIds
          );
          continue;
        }

        // Fase 1: Procesar productos existentes en Firebase
        await processExistingProducts(model, firebaseProductIds, page);

        // Fase 2: Scraping de nuevos productos
        await scrapeNewProducts(model, firebaseProductIds, page);
      } catch (error) {
        console.error(`Error en el proceso para el modelo ${model}:`, error);
      }
    }

    await browser.close();
    console.log("Proceso completado para todos los modelos.");
  } catch (error) {
    console.error("Error general al ejecutar el programa:", error);
  }
})();




