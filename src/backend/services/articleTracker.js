const articlesData = {}; // Estructura principal para almacenar los artículos

const updateArticle = (id, newData) => {
    const today = new Date().toISOString().split("T")[0]; // Fecha actual en formato YYYY-MM-DD

    if (!articlesData[id]) {
        // Si el artículo es nuevo, inicializar con la fecha actual y datos iniciales
        articlesData[id] = {
            firstDetected: new Date(),
            lastUpdate: today,
            history: [
                {
                    date: today,
                    data: newData,
                    changes: null, // No hay cambios porque es nuevo
                },
            ],
        };
        console.log(`Nuevo artículo detectado: ${id}`);
        return { status: "new", id, data: newData };
    }

    // Obtener historial y último estado
    const article = articlesData[id];
    const lastRecord = article.history[article.history.length - 1];

    // Si ya fue actualizado hoy, no hacer nada
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

    // Si no hay cambios, no añadimos un nuevo registro al historial
    if (Object.keys(changes).length === 0) {
        console.log(`No hay cambios detectados para el artículo: ${id}`);
        return { status: "unchanged", id };
    }

    // Actualizar el historial con las modificaciones
    const updatedRecord = {
        date: today,
        data: newData,
        changes, // Guardamos solo los cambios detectados
    };
    article.history.push(updatedRecord);

    // Actualizar la fecha de última actualización
    article.lastUpdate = today;

    console.log(`Artículo actualizado: ${id}`);
    return {
        status: "updated",
        id,
        changes, // Modificaciones detectadas
        newData,
    };
};

// Devuelve todos los datos de los artículos
const getArticleData = () => articlesData;

export { updateArticle, getArticleData };

