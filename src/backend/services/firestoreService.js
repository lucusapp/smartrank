import admin from "firebase-admin";
import db from "../config/firebase.js";

export async function saveScrapedProduct(product, model) {
    console.log(`Iniciando guardado de producto: ${product.id}`);

    const productRef = db.collection(model).doc(product.id);
    const today = new Date();

    try {
        const existingProduct = await productRef.get();

        let detectedChanges = {};
        if (existingProduct.exists) {
            const previousData = existingProduct.data(); // Datos previos en Firebase

            // Detectar los cambios comparando con los datos scrapeados
            Object.keys(product).forEach((key) => {
                const previousValue = previousData[key]?.toString() || ""; // Convertir a string
                const currentValue = product[key]?.toString() || ""; // Convertir a string

                if (previousValue !== currentValue) {
                    detectedChanges[key] = {
                        previous: previousData[key] || "No disponible",
                        current: product[key],
                    };
                }
            });

            console.log(`Cambios detectados para ${product.id}:`, detectedChanges);

            // Crear entrada de historial con cambios detectados
            const historyEntry = {
                date: today,
                data: { ...product },
                changes: Object.keys(detectedChanges).length > 0 ? detectedChanges : null,
            };

            // Actualizar producto con historial en Firebase
            await productRef.update({
                ...product,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                history: admin.firestore.FieldValue.arrayUnion(historyEntry),
            });

            console.log(`Producto ${product.id} actualizado en la colección ${model}.`);
        } else {
            // Producto nuevo
            const historyEntry = {
                date: today,
                data: product,
                changes: null, // No hay cambios para un producto nuevo
            };

            const newData = {
                ...product,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                history: [historyEntry],
            };
            console.log("Datos anteriores desde Firebase:", previousData);
            console.log("Datos actuales scrapeados:", product);
            console.log("Cambios detectados:", detectedChanges);

            await productRef.set(newData);
            console.log(`Nuevo producto ${product.id} guardado en la colección ${model}.`);
        }
    } catch (error) {
        console.error(`Error al guardar el producto ${product.id} en Firebase:`, error);
    }
}

export default { saveScrapedProduct };
