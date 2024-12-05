import admin from "firebase-admin";
import db from "../config/firebase.js";

export async function saveScrapedProduct(product, model, changes = {}) {
    console.log(`Guardando producto en la colección ${model}:`, product);

    const productRef = db.collection(model).doc(product.id);
    const today = new Date(); // Fecha actual

    try {
        const existingProduct = await productRef.get();

        if (existingProduct.exists) {
            // Producto existente
            const previousData = existingProduct.data(); // Datos actuales en Firestore
            const detectedChanges = {};

            // Detectar los cambios específicos
            for (const key in changes) {
                if (previousData[key] !== changes[key]) {
                    detectedChanges[key] = {
                        previous: previousData[key] || "No disponible",
                        current: changes[key],
                    };
                }
            }

            // Crear entrada del historial
            const historyEntry = {
                date: today,
                data: { ...product, ...changes },
                changes: Object.keys(detectedChanges).length > 0 ? detectedChanges : null,
            };

            // Actualizar Firestore
            await productRef.update({
                ...product,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                history: admin.firestore.FieldValue.arrayUnion(historyEntry),
            });

            console.log(`Producto ${product.id} actualizado con historial en la colección ${model}.`);
        } else {
            // Producto nuevo
            const historyEntry = {
                date: today,
                data: product,
                changes: null, // No hay cambios en un producto nuevo
            };

            const newData = {
                ...product,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                history: [historyEntry],
            };

            await productRef.set(newData);
            console.log(`Producto ${product.id} guardado en la colección ${model}.`);
        }
    } catch (error) {
        console.error(`Error al guardar el producto en la colección ${model}:`, error);
    }
}

export default { saveScrapedProduct };
