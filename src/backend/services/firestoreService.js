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
            const excludedProperties = ["imageUrls"];

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
 * Guarda o actualiza un complemento en la colección "complementos".
 * @param {Object} product - Datos del complemento.
 * @param {string} mainProductName - Nombre del producto principal.
 */
export async function saveOrUpdateComplement(product, mainProductName) {
    if (!product || !product.id || !mainProductName) {
        console.error(
            `Datos insuficientes para guardar el complemento: falta el ID o el modelo principal para el producto ${product?.id || "desconocido"}.`
        );
        return;
    }

    // if (!mainProductName) {
    //     console.error(`Error: mainProductName es inválido para el complemento ${product.id}.`);
    //     return; // O lanzar un error según sea necesario
    // }

    console.log(`Guardando/actualizando complemento: ${product.id} para ${mainProductName}`);
    const complementRef = db.collection("complementos").doc(mainProductName).collection("products").doc(product.id);

    try {
        const existingComplement = await complementRef.get();
        if (existingComplement.exists) {
            await complementRef.update({
                ...product,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`Complemento ${product.id} actualizado en complementos/${mainProductName}`);
        } else {
            await complementRef.set({
                ...product,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`Nuevo complemento ${product.id} guardado en complementos/${mainProductName}`);
        }
    } catch (error) {
        console.error(`Error al guardar o actualizar el complemento ${product.id}:`, error);
    }
}


/**
 * Mueve un complemento a la colección "complementosTerminados".
 * @param {string} productId - ID del complemento.
 * @param {string} mainProductName - Nombre del producto principal.
 */
export async function moveToTerminatedComplement(productId, mainProductName) {
    if (!productId) {
        console.error("Error: El ID del complemento no es válido. No se puede mover a 'complementosTerminados'.");
        return;
    }

    const complementRef = db.collection("complementos").doc(mainProductName).collection("products").doc(productId);
    const terminatedRef = db.collection("complementosTerminados").doc(mainProductName).collection("products").doc(productId);

    try {
        const complementSnapshot = await complementRef.get();
        if (!complementSnapshot.exists) {
            console.error(`Complemento ${productId} no encontrado en complementos/${mainProductName}`);
            return;
        }

        const complementData = complementSnapshot.data();
        console.log(`Moviendo complemento ${productId} a complementosTerminados/${mainProductName}`);

        // Mover complemento a "complementosTerminados"
        await terminatedRef.set({
            ...complementData,
            terminatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Eliminar el complemento de la colección original
        await complementRef.delete();
        console.log(`Complemento ${productId} movido correctamente a complementosTerminados/${mainProductName}`);
    } catch (error) {
        console.error(`Error al mover el complemento ${productId} a complementosTerminados:`, error);
    }
}

/**
 * Mueve un producto a la colección "terminados".
 * @param {string} productId - ID del producto.
 * @param {string} model - Nombre de la colección original.
 */
export async function moveToTerminatedCollection(productId, model) {
    if (!productId) {
        console.error("Error: El ID del producto no es válido. No se puede mover a 'terminados'.");
        return;
    }

    const sanitizedModel = model.replace(/["']/g, "");
    const productRef = db.collection(model).doc(productId);
    const terminatedRef = db.collection("terminados").doc(sanitizedModel).collection("products").doc(productId);

    try {
        const productSnapshot = await productRef.get();
        if (!productSnapshot.exists) {
            console.error(`Producto ${productId} no encontrado en la colección ${model}.`);
            return;
        }

        const productData = productSnapshot.data();
        console.log(`Moviendo producto ${productId} a terminados/${sanitizedModel}/products`);

        // Mover producto a "terminados"
        await terminatedRef.set({
            ...productData,
            terminatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Eliminar el producto de la colección original
        await productRef.delete();
        console.log(`Producto ${productId} movido correctamente a terminados/${sanitizedModel}/products`);
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

export default {
    saveOrUpdateProduct,
    moveToTerminatedCollection,
    getProcessedIds,
    saveOrUpdateComplement,
    moveToTerminatedComplement,
};



