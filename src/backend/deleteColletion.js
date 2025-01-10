// import admin from "firebase-admin";
// import db from "./config/firebase.js"; // Asegúrate de importar tu configuración de Firebase

// async function deleteAllCollections() {
//     try {
//         const collections = await db.listCollections();

//         for (const collection of collections) {
//             console.log(`Eliminando colección: ${collection.id}`);
//             await deleteCollection(collection.id);
//         }

//         console.log("Todas las colecciones han sido eliminadas.");
//     } catch (error) {
//         console.error("Error al eliminar las colecciones:", error);
//     }
// }

// async function deleteCollection(collectionName) {
//     const collectionRef = db.collection(collectionName);
//     const batchSize = 500; // Firestore limita las operaciones a 500 documentos por batch

//     async function deleteBatch() {
//         const snapshot = await collectionRef.limit(batchSize).get();

//         if (snapshot.empty) {
//             return;
//         }

//         const batch = db.batch();
//         snapshot.docs.forEach((doc) => {
//             batch.delete(doc.ref);
//         });

//         await batch.commit();
//         console.log(`Eliminados ${snapshot.size} documentos de la colección ${collectionName}.`);

//         // Llamada recursiva hasta que la colección esté vacía
//         if (snapshot.size === batchSize) {
//             await deleteBatch();
//         }
//     }

//     await deleteBatch();
// }

// // Llamar a la función para eliminar todas las colecciones
// deleteAllCollections();