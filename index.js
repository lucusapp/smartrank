const scrapeWallapop = require('./scraper');

async function main() {
    const url = 'https://fantasy.marca.com/'; // Reemplaza con un enlace de producto real
    const productData = await scrapeWallapop(url);
    console.log(productData);
}

main();



