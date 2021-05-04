const dbInterfaces = require("../database/dbInterfaces");
const { EnumMensajesErrores } = require("../errors/exceptions");
const logicInterface = require("../logicinterface/logic_postFormIndex");
const Joi = require("joi");


exports.postFormIndex = async (req, res) =>
{

    await CheckToken(res, req.body.token, dbInterfaces.tokenFromFrontend);

    let formulario = req.body;
    // TODO: generar string a partir del secreto
    formulario["token"] = await logicInterface.GenerateTokenBackendToFrontend();
    if (formulario.conductor_con_experiencia === undefined)
    {
        formulario["conductor_con_experiencia"] = "off";
    }

    const isSchemaValid = await ControlSchema(formulario);

    if (isSchemaValid === false) {
        //TODO: mejorar a redireccion ?
        // blocklist?
        console.error("Esquema invalido");
        return res.send({"isOk": false});
    }

    

    // de momento solo pilla los que estan libres, faltaria buscar por poblacion, localidad
    const cochesPreciosRaw = await logicInterface.GetCarsByReservado(formulario);

    if (cochesPreciosRaw.isOk === false)
    {
        console.error(`|- ${cochesPreciosRaw.errores}`);
        return res.send({
            "isOk": false,
            "data": [],
            "errorFormulario": "Disculpe las molestias. Gracias.",
            "diasEntreRecogidaDevolucion": undefined
        });

    }

    if (cochesPreciosRaw.resultados.length <= 0)
    {
        return res.send({
            "isOk": true,
            "data": [],
            "errorFormulario": "Sentimos informarle que no disponemos de ningún vehículo para las fechas solicitadas. Disculpe las molestias. Gracias.",
            "diasEntreRecogidaDevolucion": undefined 
        });
    }

    const resultadosObjetoCoches = await logicInterface.TransformarResultadosCoche(
        cochesPreciosRaw.resultados, 
        cochesPreciosRaw.preciosPorClase,
        formulario,
        cochesPreciosRaw.datosSuplementoGenerico.resultados,
        cochesPreciosRaw.datosSuplementoTipoChofer.resultados
    );
    
    if (resultadosObjetoCoches.isOk === false) {
        
        console.error(`|- ${resultadosObjetoCoches.errorFormulario}`);
        return res.send({
            "isOk": false,
            "data": [],
            "errorFormulario": resultadosObjetoCoches.errorFormulario,
            "diasEntreRecogidaDevolucion": resultadosObjetoCoches.diasEntreRecogidaDevolucion
        });
    }

    return res.send({
        "isOk": true,
        "data": resultadosObjetoCoches.resultadosCoches,
        "datosOrdenacion": cochesPreciosRaw.datosOrdenacion.resultados,
        "errorFormulario": resultadosObjetoCoches.errorFormulario,
        "diasEntreRecogidaDevolucion": resultadosObjetoCoches.diasEntreRecogidaDevolucion,
        "suplementogenerico_base": cochesPreciosRaw.datosSuplementoGenerico.resultados,
        "suplementotipochofer_base": cochesPreciosRaw.datosSuplementoTipoChofer.resultados,
        "preciosPorClase": cochesPreciosRaw.preciosPorClase,
        "condicionesgenerales": cochesPreciosRaw.condicionesgenerales.resultados
    });

};


const CheckToken = async (res, token, tokenFromFrontend) => {
    if (token === undefined || token !== tokenFromFrontend) {
        return res.status(404).send({});
    }

};




// control de schema para comprobar que lo que envia el frontend
// cumple con el schema

const ControlSchema = async (body) => {


    const schema = Joi.object({
        "token": Joi.string().required(),
        fechaDevolucion: Joi.string().required(),
        horaDevolucion: Joi.string().required(),
        fechaRecogida: Joi.string().required(),
        horaRecogida: Joi.string().required(),
        conductor_con_experiencia: Joi.string(),
        edad_conductor: Joi.string().required(),
    });


    const options = {
        abortEarly: false, // include all errors
        allowUnknown: true, // ignore unknown props
        stripUnknown: false // remove unknown props
    };
    const validation = schema.validate(body, options);
    let isValid = false;

    if (validation.error === undefined) {
        isValid = true;
    }

    return isValid;

}