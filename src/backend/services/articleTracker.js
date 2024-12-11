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
        return { status: "new", id, data: newData };
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
        return { status: "unchanged", id };
    }

    const updatedRecord = { date: today, data: newData, changes };
    article.history.push(updatedRecord);
    article.lastUpdate = today;

    console.log(`Artículo actualizado: ${id}, cambios detectados:`, changes);
    return { status: "updated", id, changes, newData };
};

// Devuelve todos los datos de los artículos
const getArticleData = () => articlesData;

export { updateArticle, getArticleData };

