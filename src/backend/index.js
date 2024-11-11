// src/backend/index.js
const express = require("express");
const { scrapeWallapop } = require("./scraper");
const { db } = require("../config/firebase");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Wallapop Scraper API is running.");
});

// Endpoint para el scraping
app.get("/scrape", async (req, res) => {
  const { model } = req.query;

  if (!model) {
    return res.status(400).json({ error: "Model parameter is required." });
  }

  try {
    const items = await scrapeWallapop(model);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Error scraping Wallapop" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
