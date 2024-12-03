import puppeteer from "puppeteer";
import { updateArticle, getArticleData } from "./articleTracker.js";
import { saveScrapedProduct } from "./firestoreService.js";

// Función para obtener las URLs de los productos de una lista
async function scrapeListing(listingUrl) {
  const browser = await puppeteer.launch({ headless: true });
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

// Función para extraer los detalles de un producto individual
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
      // Extracción del titulo
      const titulo = document.querySelector(
        '.item-detail_ItemDetail__title__wcPRl'
      )?.textContent.trim() || "";

      // Descripcion
      const description = document.querySelector(
        '.item-detail_ItemDetail__description__7rXXT'
      )?.textContent.trim() || "";

      // Extracción del estado de reserva
      const reservado = !!document.querySelector(
        'wallapop-badge[badge-type="reserved"]'
      );

      // Nueva extracción de vistas y favoritos
      const visitas = document.querySelector(
        '.item-detail-stats_ItemDetailStats__counters__ZFOFk [aria-label="Views"]'
      )?.textContent.trim() || "0";
      const favoritos = document.querySelector(
        '.item-detail-stats_ItemDetailStats__counters__ZFOFk [aria-label="Favorites"]'
      )?.textContent.trim() || "0";

      const ultimaEdicion = document.querySelector('.item-detail-stats_ItemDetailStats__description__vjz96')?.textContent.trim() || "Desconocido";

      // Devolver el objeto limpio
      return {
        estado,
        marca,
        modelo,
        capacidad,
        color,
        precio,
        titulo,
        description,
        reservado,
        visitas,
        favoritos,
        ultimaEdicion
      };
    });

    productDetails.lastScraped = new Date().toISOString();

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

// Función principal para scrapear los listados de productos
async function scrapeWallapopListings(modelUrl) {
  const productUrls = await scrapeListing(modelUrl);

  const products = [];
  for (const url of productUrls) {
    try {
      const details = await scrapeProductDetails(url);
      if (details) products.push(details);
    } catch (error) {
      console.error(`Error scraping product at ${url}:`, error);
    }
  }

  console.log("Scraping completado para URLs:", modelUrl);
  return products;
}

// Función para procesar y guardar los datos scrapeados
async function processScrapedData(products,model) {
  for (const product of products) {
    // Ajusta los datos a tu esquema
    const productData = {
      id: product.id || 0,  // Extraído de la URL o el scraping
      titulo: product.titulo || "Desconocido",
      description: product.description || "Sin descripción",
      lastEdited: product.lastEdited || null,
      views: product.visitas || 0,   // Ahora usamos 'vistas' para obtener las vistas
      favorites: product.favoritos || 0,  // Ahora usamos 'favoritos' para obtener los favoritos
      updatedAt: product.lastScraped || null,
    };

    // Usamos `updateArticle` para registrar o actualizar el artículo
    const updateResult = updateArticle(productData.id, productData);

    // Manejo del resultado de la actualización
    if (updateResult.status === "new") {
      console.log(`Nuevo artículo detectado: ${productData.id}`);
    } else if (updateResult.status === "updated") {
      console.log(`Artículo actualizado: ${productData.id}`);
      console.log(`Cambios detectados:`, updateResult.changes);
    } else if (updateResult.status === "unchanged") {
      console.log(`El artículo no ha cambiado hoy: ${productData.id}`);
    }

    // Ahora que se ha registrado el cambio, lo guardamos en Firestore
    await saveScrapedProduct(productData,model);
  }
}

// Exportar funciones necesarias
export { scrapeWallapopListings, scrapeProductDetails, processScrapedData };
