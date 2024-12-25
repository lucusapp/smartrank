import admin from "firebase-admin";
import db from "../config/firebase.js";

export async function getAllProductsFromCollection(collectionName) {
    try {
        const collectionRef = db.collection(collectionName);
        const snapshot = await collectionRef.get();

        if (snapshot.empty) {
            console.log(`No se encontraron productos en la colección ${collectionName}.`);
            return [];
        }

        const products = [];
        snapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });

        return products;
    } catch (error) {
        console.error(`Error al recuperar productos de la colección ${collectionName}:`, error);
        throw error;
    }
}

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
        let previousData = null;

        if (existingProduct.exists) {
            previousData = existingProduct.data();

            // Detectar cambios únicamente en campos modificados
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
        console.error(`Error al guardar el producto ${product.id} en Firebase:`, error);
    }
}
export async function updateProductInFirestore(productId, model, updatedData) {
    try {
        const productRef = db.collection(model).doc(productId);
        const today = new Date();

        const historyEntry = {
            date: today.toISOString(),
            changes: updatedData.changes || null, // Solo registrar cambios si existen
        };

        const dataToUpdate = {
            ...updatedData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            history: admin.firestore.FieldValue.arrayUnion(historyEntry),
        };

        await productRef.update(dataToUpdate);

        console.log(`Producto ${productId} actualizado exitosamente en la colección ${model}.`);
    } catch (error) {
        console.error(`Error al actualizar el producto ${productId} en Firebase:`, error);
        throw error;
    }
}

export async function moveToTerminatedCollection(product, model) {
    const terminatedRef = db.collection("terminados").doc(model).collection("items").doc(product.id);
    try {
        const data = {
            ...product,
            movedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await terminatedRef.set(data);
        console.log(`Producto ${product.id} movido a la colección 'terminados/${model}'.`);
    } catch (error) {
        console.error(`Error al mover producto ${product.id} a la colección 'terminados/${model}':`, error);
    }
}

export async function checkProductExistenceInWallapop(productId) {
    // Lógica para comprobar si el producto aún existe en Wallapop.
    // Este método es un marcador para posibles integraciones futuras.
    console.log(`Comprobando existencia del producto en Wallapop: ${productId}`);
    // Aquí puedes usar funciones como scrapeProductDetails para validar la existencia
    return true; // Simulación: siempre retorna que el producto existe
}

export async function fetchAndCompareProductsFromFirebaseAndWallapop(model) {
    try {
        const productsInFirebase = await getAllProductsFromCollection(model);

        for (const product of productsInFirebase) {
            const existsInWallapop = await checkProductExistenceInWallapop(product.id);

            if (!existsInWallapop || product.reservado) {
                await moveToTerminatedCollection(product, model);
                console.log(
                    `Producto ${product.id} no existe en Wallapop o está reservado. Movido a 'terminados'.`
                );
            } else {
                console.log(`Producto ${product.id} aún existe en Wallapop. Comprobando actualizaciones.`);
                // Aquí puedes agregar la lógica para volver a scrapear y comparar datos
            }
        }
    } catch (error) {
        console.error(
            `Error al comparar productos entre Firebase y Wallapop para el modelo ${model}:`,
            error
        );
    }
}

export default {
    saveScrapedProduct,
    updateProductInFirestore,
    moveToTerminatedCollection,
    fetchAndCompareProductsFromFirebaseAndWallapop,
    getAllProductsFromCollection,
};
