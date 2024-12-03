const articlesData = {}; //base de datos en memoria

/**
 * Actualiza o registra un artículo y su historial de cambios.
 *
 * @param {string} id - Identificador único del artículo.
 * @param {Object} newData - Datos actuales del artículo scrapeado.
 * @returns {Object} Resultado de la operación, incluyendo estado y cambios detectados.
 */
const updateArticle = (id, newData) => {
    const today = new Date().toISOString().split("T")[0]; // Fecha actual en formato YYYY-MM-DD

    if (!articlesData[id]) {
        // Si el artículo es nuevo, inicializar con la fecha actual y datos iniciales
        articlesData[id] = {
            firstDetected: new Date(),
            history: [
                {
                    date: today,
                    data: newData,
                },
            ],
        };
        console.log(`Nuevo artículo detectado: ${id}`);
        return { status: "new", id, data: newData };
    }

    // Obtener historial y último estado
    const history = articlesData[id].history;
    const lastRecord = history[history.length - 1];

    if (lastRecord.date === today) {
        console.log(`Artículo ya actualizado hoy: ${id}`);
        return { status: "unchanged", id };
    }

    // Calcular cambios en las propiedades
    const changes = {};
    Object.keys(newData).forEach((key) => {
        if (newData[key] !== lastRecord.data[key]) {
            changes[key] = {
                previous: lastRecord.data[key],
                current: newData[key],
            };
        }
    });

    if (Object.keys(changes).length === 0) {
        console.log(`No se detectaron cambios para el artículo: ${id}`);
        return { status: "unchanged", id };
    }

    // Añadir nuevo estado al historial
    history.push({
        date: today,
        data: newData,
        changes, // Adjuntar los cambios detectados
    });

    console.log(`Artículo actualizado: ${id}`);
    return {
        status: "updated",
        id,
        changes, // Modificaciones detectadas
        newData,
    };
};

/**
 * Obtiene todos los datos de los artículos.
 *
 * @returns {Object} Todos los artículos con su historial.
 */
const getArticleData = () => articlesData;

export { updateArticle, getArticleData };

