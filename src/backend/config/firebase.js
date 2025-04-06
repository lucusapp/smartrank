import dotenv from "dotenv";
import admin from "firebase-admin";
import { readFileSync } from "fs";

dotenv.config();

// Verifica si GOOGLE_APPLICATION_CREDENTIALS está definida
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error("❌ GOOGLE_APPLICATION_CREDENTIALS no está definida. Revisa tu .env o GitHub Secret.");
}

// Verifica si FIREBASE_DB_URL está definida
if (!process.env.FIREBASE_DB_URL) {
  throw new Error("❌ FIREBASE_DB_URL no está definida. Revisa tu .env o GitHub Secret.");
}

// Cargar credenciales de Firebase
const serviceAccount = JSON.parse(
  readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8")
);

// Inicializar Firebase solo si no está ya iniciado
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
}

const db = admin.firestore();

// Puedes dejar esto para debug o quitarlo luego
console.log("✅ Firebase Firestore conectado con éxito");

export default db;

