const articlesData = {}; // Estructura principal para almacenar los artículos

const updateArticle = (id, newData) => {
    const today = new Date().toISOString().split("T")[0];
    if (!articlesData[id]) {
        console.log(`Nuevo artículo detectado: ${id}`);
        articlesData[id] = {
            firstDetected: new Date(),
            lastUpdate: today,
            history: [{ date: today, data: newData, changes: null }],
        };
        return { status: "new", id, data: newData, needsRescrape: true };
    }

    const article = articlesData[id];
    const lastRecord = article.history[article.history.length - 1];

    const changes = {};
    Object.keys(newData).forEach((key) => {
        if (newData[key] !== lastRecord.data[key]) {
            changes[key] = {
                previous: lastRecord.data[key],
                current: newData[key],
            };
        }
    });

    console.log(`Comparación para ${id}:`, { newData, lastRecord, changes });

    if (Object.keys(changes).length === 0) {
        console.log(`No hay cambios detectados para el artículo: ${id}`);
        return { status: "unchanged", id, needsRescrape: false };
    }

    const updatedRecord = { date: today, changes };
    article.history.push(updatedRecord);
    article.lastUpdate = today;

    console.log(`Artículo actualizado: ${id}, cambios detectados:`, changes);
    return { status: "updated", id, changes, newData, needsRescrape: true };
};
async function shouldScrapeAgain(product, model) {
    try {
        const firebaseData = await getArticleData(product.id, model);

        if (!firebaseData) {
            console.log(`Producto nuevo (no existe en Firebase): ${product.id}`);
            return true; // Producto nuevo, debe scrapease
        }

        // Delegar comparación a updateArticle
        const { needsRescrape } = updateArticle(product.id, firebaseData);

        if (needsRescrape) {
            console.log(`Cambios detectados en el producto ${product.id}: necesita ser scrapeado de nuevo.`);
        } else {
            console.log(`Producto ${product.id} no ha cambiado: se omite.`);
        }

        return needsRescrape; // True si hay cambios, False si no
    } catch (error) {
        console.error(`Error al validar el producto ${product.id}:`, error);
        return true; // Por seguridad, scrapeamos si falla la validación
    }
}



// Devuelve todos los datos de los artículos
const getArticleData = () => articlesData;

export { updateArticle, getArticleData,shouldScrapeAgain };

