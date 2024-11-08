const scrapeWallapop = require('./scraper');

async function main() {
    const url = 'URL_DEL_PRODUCTO'; // Reemplaza con un enlace de producto real
    const productData = await scrapeWallapop(url);
    console.log(productData);
}

main();
