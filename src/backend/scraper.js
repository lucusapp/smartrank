const puppeteer = require("puppeteer");

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



const scrapeWallapop = async (model) => {
  
  try {
    console.log(`Scraping model: ${model}`);
    const url = `https://es.wallapop.com/search?kws=${model}`;
    console.log(`URL generated: ${url}`);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded" });
    console.log("Page loaded");

    const productLinks = await page.$$eval(".ItemCard a", (anchors) =>
      anchors.map((a) => a.href)
    );

    console.log(`Found ${productLinks.length} links`);

    const productDetails = [];
    for (const link of productLinks) {
      try {
        const details = await scrapeProductDetails(link);
        productDetails.push(details);
      } catch (error) {
        console.error(`Error scraping product at ${link}:`, error.message);
      }
    }

    await browser.close();
    return productDetails;
  } catch (error) {
    console.error("Error in scrapeWallapop:", error.message);
    throw new Error(`Failed to scrape Wallapop: ${error.message}`);
  }
};


// Prueba la función
scrapeWallapop("iphone").then(data => console.log(data));
