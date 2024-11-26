
import dotenv from "dotenv";
dotenv.config();

console.log("Variables de entorno:", process.env);


import express from "express"
import  scrapeWallapopMain  from "./scraper.js";
import  db  from "../backend/config/firebase.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Wallapop Scraper API is running.");
});

app.get("/scrape", async (req, res) => {
  const { model } = req.query;

  if (!model) {
    return res.status(400).json({ error: "Model parameter is required." });
  }

  try {
    const results = await scrapeWallapopMain(model);
    res.json(results);
  } catch (error) {
    console.error("Error in scraping:", error);
    res.status(500).json({ error: "Error scraping Wallapop" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

