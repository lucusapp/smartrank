import puppeteer from "puppeteer";
import fs from "fs/promises";
import { saveScrapedProduct } from "./firestoreService.js";
import { updateArticle, shouldScrapeAgain } from "./articleTracker.js"; // Importamos funciones de seguimiento

// Valida si un título es relevante basado en términos irrelevantes
function isRelevantTitle(title) {
    const irrelevantTerms = ["funda", "carcasa", "protector", "cargador"];
    const lowerTitle = title.toLowerCase();
    return !irrelevantTerms.some(term => lowerTitle.includes(term));
}

// Lee un archivo y obtiene una lista de URLs de productos
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

// Extrae los detalles de un producto desde su página web
async function scrapeProductDetails(productUrl) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        console.log(`Navegando a la URL: ${productUrl}`);
        await page.goto(productUrl, { waitUntil: "networkidle2", timeout: 30000 });

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
                ultimaEdicion,
                imagenes,
                profileHref, // Referencia al perfil para obtener valoraciones
            };
        });

        // Valida si el título del producto es relevante
        if (!isRelevantTitle(productDetails.titulo)) {
            console.log(`Producto ignorado por título irrelevante: ${productDetails.titulo}`);
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

// Procesa y guarda los datos de productos en Firebase
async function processScrapedData(products, model) {
    for (const product of products) {
        const productData = {
            id: product.id || 0,
            titulo: product.titulo || "Desconocido",
            description: product.description || "Sin descripción",
            precio: product.precio,
            color: product.color,
            capacidad: product.capacidad,
            modelo: product.modelo,
            marca: product.marca,
            estado: product.estado,
            reservado: product.reservado,
            ultimaEdicion: product.ultimaEdicion || null,
            views: product.visitas || 0,
            favorites: product.favoritos || 0,
            updatedAt: product.lastScraped || null,
            imagenes: product.imagenes || [],
            urlPerfil: product.profileHref,
            reviews: product.reviews || [],
        };

        const updateResult = updateArticle(productData.id, productData);

        console.log(`Resultado de updateArticle para ${productData.id}:`, updateResult);

        try {
            await saveScrapedProduct(productData, model, updateResult.changes || {});
            console.log(`Producto guardado en Firestore: ${productData.id}`);
        } catch (error) {
            console.error(`Error al guardar producto en Firestore: ${productData.id}`, error);
        }
    }
}


// Función principal para leer una lista de productos, scrapear y guardar
async function scrapeProductsFromList(filePath, model) {
    try {
        const urls = await readProductList(filePath);

        for (const url of urls) {
            try {
                const productDetails = await scrapeProductDetails(url);
                if (productDetails) {
                    // Validar si se debe volver a scrapeear el producto
                    const shouldRescrape = await shouldScrapeAgain(productDetails, model);
                    if (shouldRescrape) {
                        console.log(`Producto ${productDetails.titulo} necesita rescrapeo.`);
                        await processScrapedData([productDetails], model);
                    } else {
                        console.log(`Producto ${productDetails.titulo} no requiere rescrapeo.`);
                    }
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

