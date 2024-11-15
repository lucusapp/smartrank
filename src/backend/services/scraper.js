// backend/services/scraper.js
const puppeteer = require("puppeteer");

async function scrapeProductDetails(productUrl) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(productUrl, { waitUntil: "networkidle2" });
    await page.waitForSelector(".item-detail_ItemDetail__description__7rXXT");

    const productDetails = await page.evaluate(() => {
      const getTextContent = (selector) => {
        const element = document.querySelector(selector);
        return element ? element.innerText.trim() : null;
      };

      const attributes = Array.from(document.querySelectorAll('.item-detail-characteristics-details_CharacteristicsDetails__attribute__Gzko0'));
      const values = Array.from(document.querySelectorAll('.item-detail-characteristics-details_CharacteristicsDetails__value__0pdJu'));

      const details = {};

      attributes.forEach((attribute, index) => {
        const label = attribute.innerText.trim();
        const value = values[index]?.innerText.trim();
        
        switch (label) {
          case "Estado":
            details.status = value;
            break;
          case "Marca":
            details.brand = value;
            break;
          case "Modelo":
            details.model = value;
            break;
          case "Color":
            details.color = value;
            break;
          case "Capacidad de almacenamiento":
            details.storage = value;
            break;
          default:
            break;
        }
      });

      details.description = getTextContent(".item-detail_ItemDetail__description__7rXXT");

      return details;
    });

    await browser.close();
    return productDetails;

  } catch (error) {
    console.error("Error scraping product details:", error);
    await browser.close();
    throw error;
  }
}

module.exports = { scrapeProductDetails }
