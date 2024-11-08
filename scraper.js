const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/path/to/chrome-or-chromium' // Reemplaza esta ruta con el ejecutable de Chrome o Chromium en tu sistema
    });
    const page = await browser.newPage();
    await page.goto('https://example.com');
    console.log(await page.title());
    await browser.close();
})();

