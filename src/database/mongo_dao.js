const { MongoClient } = require("mongodb");
// const { CustomExceptions } = require("../errors/Exceptions");

const client = new MongoClient(process.env.MONGO_DB_URI,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        

    });

let collectionCars = undefined;
let collectionPrecios = undefined;
let collectionHelper = undefined;
const EDAD_MINIMO_FORMULARIO = 26;
const EDAD_MAXIMA_FORMULARIO = 69;

exports.conectDb = async () => {
    try {
        const connect = await client.connect();
        const currentDb = client.db(process.env.MONGO_DB_NAME);

        collectionCars = currentDb.collection(process.env.MONGO_COLECCION_CARS);
        collectionPrecios = currentDb.collection(process.env.MONGO_COLECCION_PRECIOS);
        collectionHelper = currentDb.collection(process.env.MONGO_COLECCION_HELPER);
        console.log(`[process ${process.pid}] CONNECTED TO DB`);
    }
    catch (err) {
        console.error(err);
        // throw new CustomExceptions("no posible conexion a la base de datos");
        //TODO: enviar a la db Redis para recoger los errores.
    }

};

/**
 * Devuelve listado de resultados por fecha
 * @param {Array} fecha
 * @returns {null|Array} nulo o listado de resultados
 */

exports.GetCarsByReservado = async (taken, edadChofer) =>
{

    try {

        //filtrar por checked del formulario
        // const cochesBuscar = GenerarParametros(edadChofer);
        
        const resultados = await collectionCars.find({ "reservado": taken })
        .project({ _id: 0 })
        .toArray();
        
        if (resultados !== undefined || resultados !== [])
        {
            return resultados;
        }
        else
        {
            return undefined;
        }

    }
    catch (err) {
        //TODO: enviar a otra db error, redis
        console.error(err);
        // throw new CustomExceptions("no posible conexion con la db")
    }


};

const GenerarParametros = async (edadChofer) =>
{

    if (edadChofer === "on") {
        return {
            "reservado": taken,
            "edadChofer": { $lte: EDAD_MAXIMA_FORMULARIO }
        };
    }
    else {
        return {
            "reservado": taken,
            "edadChofer": { $lt: EDAD_MINIMO_FORMULARIO }
        };
    }

};

exports.GetTiposClases = async () =>
{
    
    const tiposClases = await collectionHelper.find(
        {
            "id": "clases"
        }
    )
    .project({ _id: 0 })
    .toArray();
    
    if (tiposClases === undefined)
    {
        console.error("Insertar TIPO DE CLASES");
        return undefined;
    }
    
    return tiposClases[0].clases;
};

exports.GetPreciosPorClase = async (tiposClases) =>
{
    try {
        
        const resultados = await collectionPrecios.find(
            {
                "CLASE": { $in: tiposClases }
            }
        ).project({_id: 0}).toArray();

        if (resultados === undefined)
        {
            console.error("NO HAY TIPO DE CLASES");
            return undefined;
        }

        return resultados;

    }
    catch(error)
    {
        console.error(error);
    }

};

// module.exports = {
//     conectDb,
//     GetCarsByReservado,
//     GetPreciosPorClase
// }