import admin from "firebase-admin";
import db from "../config/firebase.js";

/**
 * Guarda o actualiza un producto en Firebase.
 * @param {Object} product - Datos del producto a guardar o actualizar.
 * @param {string} model - Nombre de la colección (modelo del producto).
 */
export async function saveOrUpdateProduct(product, model) {
    if (!product || !product.id) {
        console.error("Error: El producto no tiene un ID válido. No se puede guardar o actualizar.");
        return;
    }

    console.log(`Iniciando guardado/actualización de producto: ${product.id}`);

    const productRef = db.collection(model).doc(product.id);
    const today = new Date();

    try {
        const existingProduct = await productRef.get();
        let detectedChanges = {};
        let previousData = null;

        if (existingProduct.exists) {
            previousData = existingProduct.data();

            // Propiedades a excluir del proceso de comparación
            const excludedProperties = ["imagenes"];

            // Detectar cambios únicamente en campos modificados, excluyendo las propiedades no relevantes
            Object.keys(product).forEach((key) => {
                if (excludedProperties.includes(key)) return; // Omitir la comparación de esta propiedad

                const previousValue = previousData[key] ?? "No disponible";
                const currentValue = product[key] ?? "";

                if (previousValue !== currentValue) {
                    detectedChanges[key] = {
                        previous: previousValue,
                        current: currentValue,
                    };
                }
            });

            if (Object.keys(detectedChanges).length > 0) {
                // Registrar en el historial solo si hay cambios
                const historyEntry = {
                    date: today.toISOString(),
                    changes: detectedChanges,
                };

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
                changes: null, // Sin cambios para productos nuevos
            };

            const newData = {
                ...product,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                history: [historyEntry],
            };

            await productRef.set(newData);
            console.log(`Nuevo producto ${product.id} guardado en la colección ${model}.`);
        }
    } catch (error) {
        console.error(`Error al guardar o actualizar el producto ${product.id} en Firebase:`, error);
    }
}


/**
 * Elimina un producto de la colección principal y lo transfiere a la subcolección "products" dentro de "terminados",
 * manteniendo todos los campos originales del producto.
 * @param {Object} product - Datos del producto a mover.
 * @param {string} model - Nombre de la colección original (modelo del producto).
 */
export async function moveToTerminatedCollection(productId, model) {
    if (!productId) {
        console.error("Error: El ID del producto no es válido. No se puede mover a 'terminados'.");
        return;
    }

    const sanitizedModel = model.replace(/["']/g, ""); // Sanitiza el modelo
    const productRef = db.collection(model).doc(productId);
    const terminatedRef = db.collection("terminados").doc(sanitizedModel).collection("products").doc(productId);

    try {
        const productSnapshot = await productRef.get();
        if (!productSnapshot.exists) {
            console.error(`Producto ${productId} no encontrado en la colección ${model}.`);
            return;
        }

        const productData = productSnapshot.data();
        console.log(`Moviendo producto ${productId} a 'terminados' con los datos existentes.`);

        // Mover producto a "terminados"
        await terminatedRef.set({
            ...productData,
            terminatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Eliminar el producto de la colección original
        await productRef.delete();
        console.log(`Producto ${productId} movido correctamente a 'terminados/${sanitizedModel}/products'.`);
    } catch (error) {
        console.error(`Error al mover el producto ${productId} a 'terminados':`, error);
    }
}

/**
 * Obtiene los IDs de los productos existentes en una colección.
 * @param {string} model - Nombre de la colección (modelo del producto).
 * @returns {Promise<Set<string>>} - Conjunto de IDs de productos existentes.
 */
export async function getProcessedIds(model) {
    try {
        const snapshot = await db.collection(model).get();
        const ids = new Set();

        snapshot.forEach((doc) => ids.add(doc.id));
        console.log(`IDs procesados en la colección ${model}:`, ids);

        return ids;
    } catch (error) {
        console.error(`Error al obtener los IDs procesados de la colección ${model}:`, error);
        return new Set();
    }
}

export default { saveOrUpdateProduct, moveToTerminatedCollection, getProcessedIds };


