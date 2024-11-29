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
        // Selección del nodo HTML de características
        const caracteristicasLinea = document.querySelector(
          '.item-detail-additional-specifications_ItemDetailAdditionalSpecifications__characteristics__Ut9iT'
        )?.textContent.trim() || "";
      
        // Inicialización de propiedades
        let estado = "";
        let marca = "";
        let modelo = "";
        let capacidad = "";
        let color = "";
      
        if (caracteristicasLinea) {
          // Dividir por separadores ' · '
          const partes = caracteristicasLinea.split(' · ');
      
          // Extraer y asignar valores según las reglas
          estado = partes.shift(); // Primer elemento: Estado
          color = partes.pop(); // Último elemento: Color
          if (partes[partes.length - 1]?.includes("GB")) {
            capacidad = partes.pop(); // Si penúltimo incluye "GB": Capacidad
          }
          if (partes.length === 2) {
            [marca, modelo] = partes; // Si quedan 2 elementos: Marca y Modelo
          } else if (partes.length === 1) {
            modelo = partes[0]; // Si queda 1 elemento: Modelo
          }
        }
      
        // Extracción del precio
        const precio = document.querySelector(
          '.item-detail-price_ItemDetailPrice--standard__TxPXr'
        )?.textContent.trim() || "";
      
        // Extracción del estado de reserva
        const reservado = !!document.querySelector(
          'wallapop-badge[badge-type="reserved"]'
        );
      
        // Devolver el objeto limpio
        return {
          estado,
          marca,
          modelo,
          capacidad,
          color,
          precio,
          reservado,
        };
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
