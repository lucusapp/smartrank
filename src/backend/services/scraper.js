import puppeteer from "puppeteer";
import fs from "fs/promises";
import { saveOrUpdateProduct, getProcessedIds } from "./firestoreService.js"; // Importamos desde firebaseService.js

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
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        console.log(`Navegando a la URL: ${productUrl}`);
        await page.goto(productUrl, { waitUntil: "domcontentloaded" });
        await page.waitForSelector(".ItemDetailCarousel__initialBackground img[slot='carousel-content']", { timeout: 5000 }).catch(() => console.warn("Imágenes no encontradas."));
        await page.waitForSelector('.item-detail-header_ItemDetailHeader__fillRemainingWidth__8TxnC a', { timeout: 5000 }).catch(() => console.warn("URL del perfil no encontrada."));

        const urlParts = productUrl.split("/");
        const articleId = urlParts[urlParts.length - 1]; // ID del producto desde la URL

        const productDetails = await page.evaluate(() => {
            const caracteristicasLinea = document.querySelector(
                '.item-detail-additional-specifications_ItemDetailAdditionalSpecifications__characteristics__Ut9iT'
            )?.textContent.trim() || "";

            let estado = "";
            let marca = "";
            let modelo = "";
            let capacidad = "";
            let color = "";

            if (caracteristicasLinea) {
                const partes = caracteristicasLinea.split(" · ");
                estado = partes.shift();
                color = partes.pop();
                if (partes[partes.length - 1]?.includes("GB")) {
                    capacidad = partes.pop();
                }
                if (partes.length === 2) {
                    [marca, modelo] = partes;
                } else if (partes.length === 1) {
                    modelo = partes[0];
                }
            }

            const precio = document.querySelector(
                '.item-detail-price_ItemDetailPrice--standard__TxPXr'
            )?.textContent.trim() || "";
            const titulo = document.querySelector(
                '.item-detail_ItemDetail__title__wcPRl'
            )?.textContent.trim() || "";
            const description = document.querySelector(
                '.item-detail_ItemDetail__description__7rXXT'
            )?.textContent.trim() || "";
            const reservado = !!document.querySelector('wallapop-badge[badge-type="reserved"]');
            const views = document.querySelector(
                '.item-detail-stats_ItemDetailStats__counters__ZFOFk [aria-label="Views"]'
            )?.textContent.trim() || "0";
            const favorites = document.querySelector(
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
                estado,
                marca,
                modelo,
                capacidad,
                color,
                precio,
                titulo,
                description,
                reservado,
                views,
                favorites,
                ultimaEdicion,
                imagenes,
                profileHref, // Referencia al perfil para obtener valoraciones
            };
        });

        // Validar datos críticos
        if (!productDetails.titulo || !productDetails.precio || productDetails.imagenes.length === 0) {
            console.warn(`Campos clave faltantes para el producto en ${productUrl}:`, productDetails);
            await browser.close();
            return null;
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
        try {
            await saveOrUpdateProduct(product, model);
            console.log(`Producto guardado o actualizado en Firebase: ${product.id}`);
        } catch (error) {
            console.error(`Error al guardar o actualizar producto en Firebase: ${product.id}`, error);
        }
    }
}

export { processScrapedData, scrapeProductDetails };


