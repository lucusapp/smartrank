const articlesData = {}; // Base de datos en memoria

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

    // Añadir nuevo estado al historial
    history.push({
        date: today,
        data: newData,
    });

    console.log(`Artículo actualizado: ${id}`);
    return {
        status: "updated",
        id,
        changes, // Modificaciones detectadas
        newData,
    };
};

const getArticleData = () => articlesData;

export  { updateArticle, getArticleData };

