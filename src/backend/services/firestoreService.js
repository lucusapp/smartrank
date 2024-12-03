import admin from "firebase-admin";
import db from "../config/firebase.js";

// Guardar datos en Firestore con Admin SDK
export async function saveScrapedProduct(product, model) {
  console.log(`Guardando producto en la colección ${model}:`, product);

  // Usar el modelo como nombre de la colección
  const productRef = db.collection(model).doc(product.id); 

  try {
    const existingProduct = await productRef.get();

    if (existingProduct.exists) {
      // Si existe, actualiza los datos existentes
      await productRef.update({
        ...product,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Producto ${product.id} actualizado en la colección ${model}.`);
    } else {
      // Si no existe, crea un nuevo documento
      await productRef.set({
        ...product,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Producto ${product.id} guardado en la colección ${model}.`);
    }
  } catch (error) {
    console.error(`Error al guardar el producto en la colección ${model}:`, error);
  }
}

export default { saveScrapedProduct };