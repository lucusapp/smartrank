// src/backend/index.js
const express = require("express");
const { scrapeProductDetails } = require("./services/scraper"); // Asegúrate de que `scrapeProductDetails` esté en `scraper.js`
const { db } = require("../config/firebase");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Wallapop Scraper API is running.");
});

// Endpoint para realizar el scraping con detalles completos del producto
app.get("/scrape", async (req, res) => {
  const { model } = req.query;

  if (!model) {
    return res.status(400).json({ error: "Model parameter is required." });
  }

  try {
    const url = `https://es.wallapop.com/search?kws=${encodeURIComponent(model)}`;
    const items = await scrapeProductDetails(url); // Llama a `scrapeProductDetails` con la URL de listado
    res.json(items);
  } catch (error) {
    console.error("Error scraping Wallapop:", error);
    res.status(500).json({ error: "Error scraping Wallapop" });
  }
});

// Inicia el servidor en el puerto especificado
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
