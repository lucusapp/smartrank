const puppeteer = require("puppeteer");

async function scrapeWallapop(mobileModel) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`https://es.wallapop.com/search?kws=${mobileModel}`, {
      waitUntil: "networkidle2",
    });

    // Espera a que se cargue al menos un elemento de producto
    await page.waitForSelector(".ItemCardList__item", { timeout: 60000 });

    // Extrae la información de cada producto
    const items = await page.evaluate(() => {
      const productElements = document.querySelectorAll(".ItemCardList__item");
      const products = [];

      productElements.forEach((product) => {
        const title = product.getAttribute("title");
        const productUrl = product.href;
        const imageUrl = product.querySelector(".ItemCard__image img")?.src;

        products.push({
          title,
          productUrl,
          imageUrl,
        });
      });

      return products;
    });

    await browser.close();
    return items;

  } catch (error) {
    console.error("Error scraping Wallapop:", error);
    await browser.close();
    throw error;
  }
}

// Prueba la función
scrapeWallapop("iphone").then(data => console.log(data));
