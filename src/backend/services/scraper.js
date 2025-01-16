import puppeteer from "puppeteer";
import fs from "fs/promises";
import { saveOrUpdateProduct, saveOrUpdateComplement } from "./firestoreService.js"; // Importamos desde firebaseService.js

// Nueva función para validar títulos irrelevantes
function isRelevantTitle(title) {
    const irrelevantTerms = ["funda", "carcasa", "protector"];
    const lowerTitle = title.toLowerCase();
    return !irrelevantTerms.some(term => lowerTitle.includes(term));
}



// Función para extraer detalles de un producto
async function scrapeProductDetails(productUrl, model) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        console.log(`Navegando a la URL: ${productUrl}`);
        await page.goto(productUrl, { waitUntil: "domcontentloaded" });

        const articleId = productUrl.split("/").pop(); // ID del producto desde la URL

        // Extraer los detalles del producto
        const productDetails = await extractProductDetails(page);

        // Validar datos críticos
        if (!articleId || !productDetails.titulo || !productDetails.precio || productDetails.imagenes.length === 0) {
            console.warn(`Datos incompletos para el producto ${productUrl}:`, productDetails);
            return null;
        }

        // Identificar si es relevante
        if (!isRelevantTitle(productDetails.titulo)) {
            console.log(`Producto considerado irrelevante por título: ${productDetails.titulo}`);

            // Asegurarse de que el modelo esté definido
            const mainModel = model || "ModeloDesconocido";

            console.log(`Realizando scraping completo para producto irrelevante: ${articleId}`);
            productDetails.id = articleId;

            // Guardar como complemento
            try {
                await saveOrUpdateComplement(productDetails, mainModel);
                console.log(`Complemento irrelevante guardado: ${productDetails.id}`);
            } catch (error) {
                console.error(`Error al guardar complemento irrelevante ${articleId}:`, error);
            }

            return null; // Producto irrelevante procesado
        }

        productDetails.lastScraped = new Date().toISOString();
        const product = { id: articleId, ...productDetails };

        console.log("Datos del producto extraídos:", product);
        return product;

    } catch (error) {
        console.error(`Error scrapeando los detalles del producto en ${productUrl}:`, error);
        return null;

    } finally {
        await browser.close(); // Asegura que el navegador se cierre siempre
    }
}

// Subfunción para extraer los detalles del producto
async function extractProductDetails(page) {
    try {
        await page.waitForSelector(".ItemDetailCarousel__initialBackground img[slot='carousel-content']", { timeout: 5000 }).catch(() => console.warn("Imágenes no encontradas."));
        await page.waitForSelector('.item-detail-header_ItemDetailHeader__fillRemainingWidth__8TxnC a', { timeout: 5000 }).catch(() => console.warn("URL del perfil no encontrada."));

        return await page.evaluate(() => {
            // Lógica de extracción de datos
            const caracteristicasLinea = document.querySelector('.item-detail-additional-specifications_ItemDetailAdditionalSpecifications__characteristics__Ut9iT')?.textContent.trim() || "";
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

            const precio = document.querySelector('.item-detail-price_ItemDetailPrice--standard__TxPXr')?.textContent.trim() || "";
            const titulo = document.querySelector('.item-detail_ItemDetail__title__wcPRl')?.textContent.trim() || "";
            const description = document.querySelector('.item-detail_ItemDetail__description__7rXXT')?.textContent.trim() || "";
            const reservado = !!document.querySelector('wallapop-badge[badge-type="reserved"]');
            const views = document.querySelector('.item-detail-stats_ItemDetailStats__counters__ZFOFk [aria-label="Views"]')?.textContent.trim() || "0";
            const favorites = document.querySelector('.item-detail-stats_ItemDetailStats__counters__ZFOFk [aria-label="Favorites"]')?.textContent.trim() || "0";
            const ultimaEdicion = document.querySelector(".item-detail-stats_ItemDetailStats__description__vjz96")?.textContent.trim() || "Desconocido";

            let imagenes = [];
            try {
                const imageNodes = document.querySelectorAll(".ItemDetailCarousel__initialBackground img[slot='carousel-content']");
                imagenes = Array.from(imageNodes).map((img) => img.src || "").filter((src) => src !== "");
            } catch (imgError) {
                console.error("Error al extraer imágenes:", imgError);
            }

            const profileHrefElement = document.querySelector('.item-detail-header_ItemDetailHeader__fillRemainingWidth__8TxnC a');
            const profileHref = profileHrefElement ? profileHrefElement.href : null;

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
                profileHref,
            };
        });

    } catch (error) {
        console.error("Error durante la extracción de detalles:", error);
        return {};
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


