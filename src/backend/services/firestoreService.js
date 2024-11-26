import admin from "firebase-admin";
import db from "../config/firebase.js";

// Guardar datos en Firestore con Admin SDK
export async function saveScrapedProduct(product) {
  console.log(product)

  const productRef = db.collection("scrapedProducts").doc(product.id); // Admin SDK usa .collection().doc()


  try {
    const existingProduct = await productRef.get();

    if (existingProduct.exists) {
      // Si existe, actualiza los datos existentes
      await productRef.update({
        ...product,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Producto ${product.id} actualizado en Firestore.`);
    } else {
      // Si no existe, crea un nuevo documento
      await productRef.set({
        ...product,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Producto ${product.id} guardado en Firestore.`);
    }
  } catch (error) {
    console.error("Error al guardar el producto en Firestore:", error);
  }
}

export default { saveScrapedProduct };  