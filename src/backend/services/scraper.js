import puppeteer from "puppeteer";
import fs from "fs/promises";
import { updateArticle } from "./articleTracker.js";
import { saveScrapedProduct } from "./firestoreService.js";
import { scrapeReviewsData } from "./reviewsData.js"; // Importamos el módulo para valoraciones

// Nueva función para validar títulos irrelevantes
function isRelevantTitle(title) {
    const irrelevantTerms = ["funda", "carcasa", "pantalla", "protector", "cargador"];
    const lowerTitle = title.toLowerCase();
    return !irrelevantTerms.some(term => lowerTitle.includes(term));
}

// Función para leer URLs desde un archivo
async function readProductList(filePath) {
    try {
        const fileContent = await fs.readFile(filePath, "utf-8");
        const urls = fileContent.split("\n").map(line => line.trim()).filter(Boolean);
        console.log(`Leídas ${urls.length} URLs desde ${filePath}`);
        return urls;
    } catch (error) {
        console.error(`Error al leer el archivo ${filePath}:`, error);
        throw error;
    }
}

// Función para extraer detalles de un producto
async function scrapeProductDetails(productUrl) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        console.log(`Navegando a la URL: ${productUrl}`);
        await page.goto(productUrl, { waitUntil: "networkidle2", timeout: 30000 });

        const urlParts = productUrl.split("/");
        const articleId = urlParts[urlParts.length - 1]; // ID del producto desde la URL

        const productDetails = await page.evaluate(() => {
            const titulo = document.querySelector(
                '.item-detail_ItemDetail__title__wcPRl'
            )?.textContent.trim() || "";

            const precio = document.querySelector(
                '.item-detail-price_ItemDetailPrice--standard__TxPXr'
            )?.textContent.trim() || "";

            const description = document.querySelector(
                '.item-detail_ItemDetail__description__7rXXT'
            )?.textContent.trim() || "";

            const reservado = !!document.querySelector('wallapop-badge[badge-type="reserved"]');
            const visitas = document.querySelector(
                '.item-detail-stats_ItemDetailStats__counters__ZFOFk [aria-label="Views"]'
            )?.textContent.trim() || "0";

            const favoritos = document.querySelector(
                '.item-detail-stats_ItemDetailStats__counters__ZFOFk [aria-label="Favorites"]'
            )?.textContent.trim() || "0";

            const ultimaEdicion = document.querySelector(
                ".item-detail-stats_ItemDetailStats__description__vjz96"
            )?.textContent.trim() || "Desconocido";

            let imagenes = [];
            try {
                const imageNodes = document.querySelectorAll(".ItemDetailCarousel__initialBackground img[slot='carousel-content']");
                imagenes = Array.from(imageNodes).map((img) => img.src || "").filter((src) => src !== "");
            } catch (imgError) {
                console.error("Error al extraer imágenes:", imgError);
            }

            const profileHrefElement = document.querySelector(
                '.item-detail-header_ItemDetailHeader__fillRemainingWidth__8TxnC a'
            );
            const profileHref = profileHrefElement
                ? profileHrefElement.href // Capturamos el href absoluto
                : null;

            return {
                titulo,
                precio,
                description,
                reservado,
                visitas,
                favoritos,
                ultimaEdicion,
                imagenes,
                profileHref, // Referencia al perfil para obtener valoraciones
            };
        });

        // Validamos si el título es relevante
        if (!isRelevantTitle(productDetails.titulo)) {
            console.log(`Producto ignorado por título irrelevante: ${productDetails.titulo}`);
            await browser.close();
            return null; // Ignoramos este producto
        }

        productDetails.lastScraped = new Date().toISOString();
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

// Función para procesar y guardar datos
async function processScrapedData(products, model) {
    for (const product of products) {
        const updateResult = updateArticle(product.id, product);

        console.log(`Resultado de updateArticle para ${product.id}:`, updateResult);

        try {
            await saveScrapedProduct(product, model, updateResult.changes || {});
            console.log(`Producto guardado en Firestore: ${product.id}`);
        } catch (error) {
            console.error(`Error al guardar producto en Firestore: ${product.id}`, error);
        }
    }
}

// Función principal para leer, scrapear y guardar
async function scrapeProductsFromList(filePath, model) {
    try {
        const urls = await readProductList(filePath);

        for (const url of urls) {
            try {
                const productDetails = await scrapeProductDetails(url);
                if (productDetails && productDetails.profileHref) {
                    const reviews = await scrapeReviewsData(productDetails.profileHref);
                    productDetails.reviews = reviews;
                }
                if (productDetails) {
                    console.log(`Guardando producto: ${productDetails.id}`);
                    await processScrapedData([productDetails], model);
                }
            } catch (error) {
                console.error(`Error al procesar la URL: ${url}`, error);
            }
        }

        console.log("Proceso completado.");
    } catch (error) {
        console.error("Error al procesar el archivo de lista:", error);
    }
}

export { scrapeProductsFromList, processScrapedData, scrapeProductDetails };


