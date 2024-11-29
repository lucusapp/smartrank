import { scrapeProductDetails } from "./services/scraper.js"; // Ajusta el path si es necesario
import { saveScrapedProduct } from "./services/firestoreService.js"; // Ajusta el path si es necesario

// URL fija que queremos scrapeear
const PRODUCT_URL = "https://es.wallapop.com/item/oppo-a53s-1054354140"; // Cambia a una URL que quieras probar

async function scrapeAndSave() {
  try {
    console.log(`Iniciando scrapeo del producto en la URL: ${PRODUCT_URL}`);

    // Scrapeamos los detalles del producto
    const productDetails = await scrapeProductDetails(PRODUCT_URL);
    if (!productDetails) {
      console.error("No se pudieron obtener los detalles del producto.");
      return;
    }

    console.log("Detalles del producto extraídos:", productDetails);

    // Guardamos en Firebase
    console.log("Intentando guardar los detalles en Firebase...");
    await saveScrapedProduct(productDetails);
    console.log("Producto guardado exitosamente en Firebase.");
  } catch (error) {
    console.error("Error durante el proceso de scraping y guardado:", error);
  }
}

// Ejecutar la prueba
scrapeAndSave();