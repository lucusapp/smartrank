
import dotenv from "dotenv";
dotenv.config();

//console.log("Variables de entorno:", process.env);

import express from "express"
import { scrapeProductsFromList } from "../backend/services/scraper.js";

// Ruta al archivo que contiene las URLs de productos
const filePath = "./product-list.txt";

// Modelo que se utilizará para categorizar o guardar en Firestore
const model = "products";

// Ejecutar el proceso de scraping
(async () => {
    try {
        console.log("Iniciando el scraping de productos...");
        await scrapeProductsFromList(filePath, model);
        console.log("Proceso de scraping finalizado.");
    } catch (error) {
        console.error("Error durante el scraping:", error);
    }
})();

import  db  from "../backend/config/firebase.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Wallapop Scraper API is running.");
});

app.get("/scrape", async (req, res) => {
  const model = req.query.model;
  if (!model) {
    return res.status(400).send("Por favor, especifica un modelo en la URL.");
  }

  try {
    console.log(`Iniciando scraping para el modelo: ${model}`);
    const products = await scrapeWallapopListings(`https://wallapop.com/${model}`);
    await processScrapedData(products, model); // Pasa el modelo
    res.status(200).send(`Scraping completado para el modelo: ${model}`);
  } catch (error) {
    console.error("Error durante el scraping:", error);
    res.status(500).send("Ocurrió un error durante el scraping.");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

