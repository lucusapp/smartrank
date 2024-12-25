import admin from "firebase-admin";
import fs from "fs/promises";

// Inicializa Firebase Admin SDK
import db from "./config/firebase.js"; // Ajusta el path según tu estructura

// Valida si un título es relevante basado en términos irrelevantes
function isRelevantTitle(title) {
    const irrelevantTerms = ["funda", "carcasa", "protector", "cargador"];
    const lowerTitle = title.toLowerCase();
    return !irrelevantTerms.some((term) => lowerTitle.includes(term));
}

async function readProductList(filePath) {
    try {
        const fileContent = await fs.readFile(filePath, "utf-8");
        const productNames = fileContent.split("\n").map((line) => line.trim()).filter(Boolean);
        console.log(`Leídas ${productNames.length} líneas desde ${filePath}`);
        return productNames;
    } catch (error) {
        console.error(`Error al leer el archivo ${filePath}:`, error);
        throw error;
    }
}

async function cleanCollections(productNames) {
    for (const product of productNames) {
        console.log(`Procesando colección: ${product}`);
        const collectionRef = db.collection(product);

        try {
            const snapshot = await collectionRef.get();

            if (snapshot.empty) {
                console.log(`La colección ${product} está vacía.`);
                continue;
            }

            for (const doc of snapshot.docs) {
                const productData = doc.data();
                const title = productData.titulo || "Sin título";

                if (!isRelevantTitle(title)) {
                    console.log(`Producto irrelevante detectado: ${title}`);

                    // Mueve el producto a la colección `isIrrelevant/{product}`
                    const irrelevantRef = db.collection("isIrrelevant").doc(product).collection("items");
                    await irrelevantRef.doc(doc.id).set(productData);

                    // Elimina el producto de la colección original
                    await collectionRef.doc(doc.id).delete();

                    console.log(`Producto movido a isIrrelevant/${product}: ${title}`);
                }
            }

            console.log(`Colección ${product} procesada correctamente.`);
        } catch (error) {
            console.error(`Error procesando la colección ${product}:`, error);
        }
    }

    console.log("Proceso de limpieza completado.");
}

(async () => {
    const filePath = "./product-list.txt"; // Ruta al archivo con los nombres de productos
    try {
        const productNames = await readProductList(filePath);

        if (productNames.length === 0) {
            console.error("No se encontraron productos en la lista.");
            process.exit(1);
        }

        await cleanCollections(productNames);
    } catch (error) {
        console.error("Error general al ejecutar el script de limpieza:", error);
        process.exit(1);
    }
})();
