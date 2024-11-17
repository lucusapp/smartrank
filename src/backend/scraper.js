//const puppeteer = require("puppeteer");

// async function scrapeWallapop(mobileModel) {
//   const browser = await puppeteer.launch({ headless: true });
//   const page = await browser.newPage();

//   try {
//     await page.goto(`https://es.wallapop.com/search?kws=${mobileModel}`, {
//       waitUntil: "networkidle2",
//     });

//     // Espera a que se cargue al menos un elemento de producto
//     await page.waitForSelector(".ItemCardList__item", { timeout: 60000 });

//     // Extrae la información de cada producto
//     const items = await page.evaluate(() => {
//       const productElements = document.querySelectorAll(".ItemCardList__item");
//       const products = [];

//       productElements.forEach((product) => {
//         const title = product.getAttribute("title");
//         const productUrl = product.href;
//         const imageUrl = product.querySelector(".ItemCard__image img")?.src;

//         products.push({
//           title,
//           productUrl,
//           imageUrl,
//         });
//       });

//       return products;
//     });

//     await browser.close();
//     return items;

//   } catch (error) {
//     console.error("Error scraping Wallapop:", error);
//     await browser.close();
//     throw error;
//   }
// }



const puppeteer = require("puppeteer");
const { scrapeProductDetails } = require("./services/scraper");

async function scrapeWallapop(model) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  //const searchUrl = `https://es.wallapop.com/search?kws=${encodeURIComponent(model)}`;
  const searchUrl = `https://es.wallapop.com/app/search?filters_source=search_box&keywords=oppo%20a53s&latitude=42.5137987&longitude=-8.8128925`;
  await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".ItemCardList__item"); // Selector de un elemento visible cuando la página está completamente cargada
  const html = await page.content();
  console.log(html);


  const productLinks = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll("a[data-test='item-card-container']") // Ajusta el selector si es necesario
    ).map((link) => link.href);
  });

  const detailedProducts = [];
  for (const link of productLinks) {
    try {
      const details = await scrapeProductDetails(link);
      detailedProducts.push({ url: link, ...details });
    } catch (error) {
      console.error(`Error scraping product details for ${link}:`, error);
    }
  }

  await browser.close();
  return detailedProducts;
}

module.exports = { scrapeWallapop };
