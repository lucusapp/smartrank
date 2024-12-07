import puppeteer from 'puppeteer'

// Función para construir dinámicamente la URL de valoraciones
function constructReviewsUrl(profileHref) {
  const baseUrl = 'https://es.wallapop.com';
  const profileRegex = /^\/user\/[a-zA-Z0-9-]+$/;

  if (!profileRegex.test(profileHref)) {
    throw new Error('El perfil extraído no tiene un formato válido.');
  }

  return `${baseUrl}${profileHref}/reviews`;
}

// Función para extraer las valoraciones
async function extractReviews(page) {
  return await page.evaluate(() => {
    const reviewItems = document.querySelectorAll('.public-profile-review_PublicProfileReview__jznOm');
    return Array.from(reviewItems).map(review => {
      const type = review.querySelector('.public-profile-review_PublicProfileReview__information__reviewType__n5CuO span')?.textContent.trim();
      const title = review.querySelector('.public-profile-review_PublicProfileReview__information__title__4yUM7 span')?.textContent.trim();
      const rating = review.querySelectorAll('.stars-rate_StarsRate__6gy8r walla-icon[aria-label="full star"]').length;
      const comment = review.querySelector('p.d-flex.my-2')?.textContent.trim();
      const reviewerName = review.querySelector('.public-profile-review_PublicProfileReview__information__reviewer__HM4QF a')?.textContent.trim();
      const reviewerLink = review.querySelector('.public-profile-review_PublicProfileReview__information__reviewer__HM4QF a')?.href;
      const date = review.querySelector('.public-profile-review_PublicProfileReview__information__reviewBy___teLe:nth-child(2)')?.textContent.trim();
      const productLink = review.querySelector('.public-profile-review_PublicProfileReview__imagesContainer__product__eppVm a')?.href || null;
      const productImage = review.querySelector('.public-profile-review_PublicProfileReview__imagesContainer__product__eppVm img')?.src || null;

      return {
        type,
        title,
        rating,
        comment,
        reviewerName,
        reviewerLink,
        date,
        productLink,
        productImage,
      };
    });
  });
}

// Función principal que gestiona el proceso completo de scraping de valoraciones
async function scrapeReviewsData(profileHref) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    // Construir la URL dinámica
    const reviewsUrl = constructReviewsUrl(profileHref);
    console.log(`Navegando a la URL de valoraciones: ${reviewsUrl}`);

    // Navegar a la página de valoraciones
    await page.goto(reviewsUrl, { waitUntil: 'domcontentloaded' });

    // Extraer las valoraciones
    const reviews = await extractReviews(page);

    console.log(`Valoraciones extraídas (${reviews.length}):`, reviews);
    return reviews;
  } catch (error) {
    console.error('Error en el scraping de valoraciones:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

export {scrapeReviewsData};
