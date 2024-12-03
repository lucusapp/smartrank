
import dotenv from "dotenv";
dotenv.config();

console.log("Variables de entorno:", process.env);


import express from "express"
import { scrapeWallapopListings, processScrapedData } from "./services/scraper.js";

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

