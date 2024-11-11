const puppeteer = require('puppeteer');

async function scrapeWallapop(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Extraer los datos del producto
    const data = await page.evaluate(() => {
        return {
            title: document.querySelector('h1')?.innerText || 'No Title',
            description: document.querySelector('.product-detail-description')?.innerText || 'No Description',
            price: document.querySelector('.price')?.innerText || 'No Price',
            images: Array.from(document.querySelectorAll('.image-selector img')).map(img => img.src)
        };
    });

    await browser.close();
    return data;
}

module.exports = scrapeWallapop;

