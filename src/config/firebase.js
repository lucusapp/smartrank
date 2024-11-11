// src/config/firebase.js
const admin = require("firebase-admin");
const serviceAccount = require("../../firebaseServiceAccount.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://smartrank.firebaseio.com",
});

const db = admin.firestore();
module.exports = { db };
