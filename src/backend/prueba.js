import admin from "firebase-admin";
import db from "../backend/config/firebase.js";

export async function saveScrapedProduct(product, model, changes = {}) {
    console.log(`Guardando producto en la colección ${model}:`, product);

    const productRef = db.collection(model).doc(product.id);

    try {
        const existingProduct = await productRef.get();

        if (existingProduct.exists) {
            // Si existe, agregar los cambios al historial si hay modificaciones
            if (Object.keys(changes).length > 0) {
                // Crear el historial con un timestamp real
                const historyEntry = {
                    date: new Date().toISOString(), // Genera el timestamp aquí
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
async function testHistory() {
    const product = {
        id: "test-product",
        titulo: "Producto Test",
        precio: "100 €",
        estado: "Nuevo",
    };

    const changes = { precio: "150 €" }; // Simulamos un cambio en el precio

    await saveScrapedProduct(product, "products", changes);

    const db = (await import("./config/firebase.js")).default;
    const doc = await db.collection("products").doc(product.id).get();

    console.log("Producto actualizado:", doc.data());
}

testHistory();


export default { saveScrapedProduct };