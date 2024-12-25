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
import { scrapeProductDetails } from "./services/scraper.js";
import { 
    getAllProductsFromCollection, 
    updateProductInFirestore, 
    moveToTerminatedCollection 
} from "./services/firestoreService.js";
import fs from "fs/promises";

// Recupera todos los productos de Firebase, los busca en Wallapop y actualiza los cambios detectados
async function processFirebaseCollection(collectionName) {
    console.log(`Procesando la colección: ${collectionName}`);

    try {
        const firebaseProducts = await getAllProductsFromCollection(collectionName);

        for (const firebaseProduct of firebaseProducts) {
            const { id, url, reservado } = firebaseProduct;

            try {
                if (reservado) {
                    // Mover a la colección de terminados si está reservado
                    await moveToTerminatedCollection(collectionName, firebaseProduct, "Reservado");
                    console.log(`Producto reservado con ID ${id} movido a terminados.`);
                    continue;
                }

                // Buscar producto en Wallapop
                const scrapedProduct = await scrapeProductDetails(url);

                if (!scrapedProduct) {
                    // Si no existe en Wallapop, mover a la colección terminados
                    await moveToTerminatedCollection(collectionName, firebaseProduct, "No disponible");
                    console.log(`Producto con ID ${id} no encontrado en Wallapop. Movido a terminados.`);
                    continue;
                }

                // Comparar y actualizar en Firebase si hay cambios
                const updateResult = await updateProductInFirestore(collectionName, firebaseProduct, scrapedProduct);

                if (updateResult.updated) {
                    console.log(`Producto con ID ${id} actualizado con cambios detectados.`);
                } else {
                    console.log(`Producto con ID ${id} ya estaba actualizado.`);
                }
            } catch (error) {
                console.error(`Error procesando el producto con ID ${id}:`, error);
            }
        }

        console.log(`Procesamiento completado para la colección: ${collectionName}`);
    } catch (error) {
        console.error(`Error al procesar la colección ${collectionName}:`, error);
    }
}

// Compara los productos de Firebase y Wallapop para detectar cambios
function compareProducts(firebaseProduct, scrapedProduct) {
    const updatedData = {};

    for (const key in scrapedProduct) {
        if (scrapedProduct[key] !== undefined && scrapedProduct[key] !== firebaseProduct[key]) {
            updatedData[key] = scrapedProduct[key];
        }
    }

    return updatedData;
}

async function fetchAndCompareProductsFromFirebaseAndWallapop() {
    try {
        const productListFilePath = "./product-list.txt";
        const productNames = await fs.readFile(productListFilePath, "utf-8")
            .then(content => content.split("\n").map(line => line.trim()).filter(Boolean));

        for (const productName of productNames) {
            console.log(`Procesando la colección: ${productName}`);
            const productsFromFirebase = await getAllProductsFromCollection(productName);

            if (!productsFromFirebase || productsFromFirebase.length === 0) {
                console.log(`No se encontraron productos en la colección ${productName}.`);
                continue;
            }

            console.log(`Productos recuperados de Firebase para ${productName}:`, productsFromFirebase);

            for (const firebaseProduct of productsFromFirebase) {
                const url = `https://es.wallapop.com/item/${firebaseProduct.id}`;
                const scrapedProduct = await scrapeProductDetails(url);

                if (!scrapedProduct) {
                    console.log(`Producto con ID ${firebaseProduct.id} ya no existe en Wallapop.`);
                    await moveToTerminatedCollection(firebaseProduct, productName, true);
                } else {
                    const updatedData = compareProducts(firebaseProduct, scrapedProduct);

                    if (Object.keys(updatedData).length > 0) {
                        console.log(`Cambios detectados para ${firebaseProduct.id}. Actualizando...`);
                        await updateProductInFirestore(firebaseProduct.id, productName, updatedData);
                    } else {
                        console.log(`No se detectaron cambios para ${firebaseProduct.id}.`);
                    }
                }
            }

            console.log(`Procesamiento completado para la colección: ${productName}.`);
        }
    } catch (error) {
        console.error("Error al procesar productos desde Firebase y Wallapop:", error);
    }
}

(async () => {
    try {
        await fetchAndCompareProductsFromFirebaseAndWallapop();
    } catch (error) {
        console.error("Error general en la ejecución del scraper:", error);
        process.exit(1);
    }
})();




