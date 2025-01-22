import admin from "firebase-admin";
import db from "./config/firebase.js";


async function moveUnreservedProducts() {
    try {
        const terminatedCollection = db.collection("terminados");
        const terminatedModels = await terminatedCollection.listDocuments();

        for (const modelDoc of terminatedModels) {
            const modelName = modelDoc.id;
            const productsSnapshot = await modelDoc.collection("products").get();

            console.log(`Procesando productos para el modelo: ${modelName}`);

            for (const productDoc of productsSnapshot.docs) {
                const productData = productDoc.data();
                const { reservado = null, imagenes = null, perfil = null } = productData;

                if (reservado === false) {
                    console.log(`Producto no reservado identificado: ${productDoc.id}`);

                    // Validar campos clave
                    if (!imagenes || !perfil) {
                        console.warn(
                            `El producto ${productDoc.id} tiene campos faltantes (imagenes, perfil). Registrando en errores.`
                        );

                        // Mover a una subcolección de errores dentro de pendientes
                        const errorRef = db
                            .collection("pendientes")
                            .doc("errores")
                            .collection("products")
                            .doc(productDoc.id);

                        await errorRef.set({
                            ...productData,
                            movedToPendientesAt: admin.firestore.FieldValue.serverTimestamp(),
                            error: "Campos faltantes (imagenes, perfil)",
                        });

                        // Eliminar el producto de la colección terminados
                        await productDoc.ref.delete();
                        console.log(`Producto movido a pendientes/errores/products y eliminado de terminados.`);
                        continue; // Pasar al siguiente producto
                    }

                    // Mover a la colección pendientes
                    const pendingRef = db
                        .collection("pendientes")
                        .doc(modelName)
                        .collection("products")
                        .doc(productDoc.id);

                    await pendingRef.set({
                        ...productData,
                        movedToPendientesAt: admin.firestore.FieldValue.serverTimestamp(),
                    });

                    // Eliminar el producto de la colección terminados
                    await productDoc.ref.delete();
                    console.log(`Producto movido a pendientes/${modelName}/products y eliminado de terminados.`);
                }
            }
        }

        console.log("Proceso completado.");
    } catch (error) {
        console.error("Error procesando productos terminados:", error);
    }
}

// Ejecutar el script
moveUnreservedProducts();
