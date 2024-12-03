import admin from "firebase-admin";
import db from "../config/firebase.js";

export async function saveScrapedProduct(product, model, changes = {}) {
    console.log(`Guardando producto en la colección ${model}:`, product);

    const productRef = db.collection(model).doc(product.id);

    try {
        const existingProduct = await productRef.get();

        if (existingProduct.exists) {
            // Si existe, agregar los cambios al historial si hay modificaciones
            if (Object.keys(changes).length > 0) {
                const historyEntry = {
                    date: admin.firestore.FieldValue.serverTimestamp(),
                    changes,
                };

                await productRef.update({
                    ...product,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    history: admin.firestore.FieldValue.arrayUnion(historyEntry),
                });
                console.log(`Producto ${product.id} actualizado con historial en la colección ${model}.`);
            } else {
                // Actualización sin cambios detectados
                await productRef.update({
                    ...product,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log(`Producto ${product.id} actualizado sin cambios detectados en la colección ${model}.`);
            }
        } else {
            // Si no existe, crear un nuevo documento
            await productRef.set({
                ...product,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                history: [], // Inicializar historial vacío
            });
            console.log(`Producto ${product.id} guardado en la colección ${model}.`);
        }
    } catch (error) {
        console.error(`Error al guardar el producto en la colección ${model}:`, error);
    }
}

export default { saveScrapedProduct };
