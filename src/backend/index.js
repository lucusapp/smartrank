const express = require("express");
const { scrapeWallapop } = require("./services/scraper");  // Asegúrate de que la ruta sea correcta según la estructura de carpetas
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Wallapop Scraper API is running.");
});

// Endpoint para el scraping
app.get("/scrape", async (req, res) => {
  const { model } = req.query;
  console.log("Received model:", model); // Añade este log

  if (!model) {
    return res.status(400).json({ error: "Model parameter is required." });
  }

  try {
    const items = await scrapeWallapop(model);
    res.json(items);
  } catch (error) {
    console.error("Error scraping Wallapop:", error.message);
    res.status(500).json({ error: error.message });
  }
});
