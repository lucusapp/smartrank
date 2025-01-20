// src/config/firebase.js

import dotenv from "dotenv";
dotenv.config();
console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS)

import admin from "firebase-admin";
import { readFileSync } from "fs";

// Verifica si GOOGLE_APPLICATION_CREDENTIALS está definida
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error("GOOGLE_APPLICATION_CREDENTIALS no está definida. Revisa tu archivo .env.");
}

//Cargar credenciales de Firebase
const serviceAccount = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
// const serviceAccount = JSON.parse(
//   readFileSync("C:/Users/Jose M/Documents/GitHub/smartrank/src/firebaseServiceAccount.json", "utf8")
// );

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://smartrank.firebaseio.com",
    // process.env.FIREBASE_DB_URL, // Usar la URL desde las variables de entorno
  });
}

const db = admin.firestore();
console.log(db)
export default db;
