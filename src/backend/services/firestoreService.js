import admin from "firebase-admin";
import db from "../config/firebase.js";

export async function saveScrapedProduct(product, model) {
    if (!product || !product.id) {
        console.error("Error: El producto no tiene un ID válido. No se puede guardar.");
        return;
    }

    console.log(`Iniciando guardado de producto: ${product.id}`);

    const productRef = db.collection(model).doc(product.id);
    const today = new Date();

    try {
        const existingProduct = await productRef.get();
        let detectedChanges = {};
        let previousData = null; // Inicializar la variable para evitar errores de referencia

        if (existingProduct.exists) {
            previousData = existingProduct.data(); // Datos previos en Firebase

            // Detectar los cambios comparando con los datos scrapeados
            Object.keys(product).forEach((key) => {
                const previousValue = previousData[key] ?? "No disponible";
                const currentValue = product[key] ?? "";

                if (previousValue !== currentValue) {
                    detectedChanges[key] = {
                        previous: previousValue,
                        current: currentValue,
                    };
                }
            });

            console.log(`Cambios detectados para ${product.id}:`, detectedChanges);

            if (Object.keys(detectedChanges).length > 0) {
                // Crear entrada de historial con cambios detectados
                const historyEntry = {
                    date: today.toISOString(),
                    data: { ...product },
                    changes: detectedChanges,
                };

                // Actualizar producto con historial en Firebase
                await productRef.update({
                    ...product,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    history: admin.firestore.FieldValue.arrayUnion(historyEntry),
                });

                console.log(`Producto ${product.id} actualizado en la colección ${model}.`);
            } else {
                console.log(`Producto ${product.id} no tiene cambios. No se actualizó.`);
            }
        } else {
            // Producto nuevo
            const historyEntry = {
                date: today.toISOString(),
                data: product,
                changes: null, // No hay cambios para un producto nuevo
            };

            const newData = {
                ...product,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                history: [historyEntry],
            };

            console.log("Datos actuales scrapeados:", product);

            await productRef.set(newData);
            console.log(`Nuevo producto ${product.id} guardado en la colección ${model}.`);
        }
    } catch (error) {
        console.error(`Error al guardar el producto ${product.id} en Firebase:`, error);
    }
}

export default { saveScrapedProduct };
