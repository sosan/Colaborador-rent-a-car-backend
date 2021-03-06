const Joi = require("joi");
const dbInterfaces = require("../database/dbInterfaces");
const logicStats = require("../logicinterface/logic_stats");
const traducciones = require("../controllers/location");
const fetch = require("node-fetch");
const { transporter } = require("./logicSendEmail");
const { descripcionVehiculos } = require("./logicGetReservas");
const logicPostFormIndex = require("./logic_postFormIndex");
const crypto = require("crypto");
const base64url = require("base64url");
const nanoid = require("nanoid");


const URI_EMAIL_ADMIN_API_BACKEND = `${process.env.URI_EMAIL_ADMIN_API_BACKEND}`;
const EMAIL_ADMIN_TOKEN_API = `${process.env.EMAIL_ADMIN_TOKEN_API}`;
const EMAIL_ADMIN_SECRET_TOKEN_API = `${process.env.EMAIL_ADMIN_SECRET_TOKEN_API}`;


const URI_EMAIL_USER_API_BACKEND = `${process.env.URI_EMAIL_USER_API_BACKEND}`;
const EMAIL_USER_TOKEN_API = `${process.env.EMAIL_USER_TOKEN_API}`;
const EMAIL_USER_SECRET_TOKEN_API = `${process.env.EMAIL_USER_SECRET_TOKEN_API}`;

const EMAIL_ADMIN_RECIBIR_RESERVAS_1 = `${process.env.EMAIL_ADMIN_RECIBIR_RESERVAS_1}`;
const EMAIL_ADMIN_RECIBIR_RESERVAS_2 = `${process.env.EMAIL_ADMIN_RECIBIR_RESERVAS_2}`;

// const authBase64 = Buffer.from(`${EMAIL_USER_TOKEN_API}:${EMAIL_USER_SECRET_TOKEN_API}`, "utf-8").toString("base64");
// let imagen_base64 = undefined;

const htmlEmail = `
<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body>
    <a href="0000">
        <img src="https://www.rentcarmallorca.es/img/Img-Logo/rentacar_logo_header.png">
    </a><br><br>
    XXXXXX
<br>
</body>

</html>
`;

// TODO: generar string a partir del secreto
const GenerateTokenBackendToFrontend = async () => {

    return process.env.TOKEN_BACKEND_TO_FRONTEND_SECRET;
};


exports.EnviarCorreos = async (resultadoInsercion, formulario) =>
{

    const traduccion = await traducciones.ObtenerTraduccionEmailUsuario(formulario.idioma);

    if (traduccion === undefined) return;

    let bodyEmail = await ContruirEmailUsuario(resultadoInsercion, formulario, traduccion);

    const resultadoUserEmailSended = await EnviarCorreoIo( bodyEmail);
    
    
    if (resultadoUserEmailSended.cannotSend === true)
    {
        //TODO: enviarlo a una base de datos para procesar mas tarde
    }
// -------------

    // envio correo administracion
    bodyEmail = await ConstruirEmailAdmins(resultadoInsercion, formulario);

    //envio correo admins
    const resultadoAdminEmailSended = await EnviarCorreoIo(bodyEmail);
    
    const emailsEnviados = {
        "resultadoUserEmailSended": resultadoUserEmailSended,
        "resultadoAdminEmailSended": resultadoAdminEmailSended
    };

    return emailsEnviados;

};

exports.ConfirmacionEmailsEnviados = async (emailsEnviados, objectId) =>
{

    const currentDate = await ObtenerCurrentDate();

    emailsEnviados["fechaEmailsActualizado"] = currentDate;
    emailsEnviados.resultadoUserEmailSended["fechaEmailsActualizado"] = currentDate;
    emailsEnviados.resultadoAdminEmailSended["fechaEmailsActualizado"] = currentDate;

    //buscar por id
    const isUpdated = await dbInterfaces.UpdateReserva(emailsEnviados, objectId);
    console.log(`emails enviados:\n-> Usuarios: ${emailsEnviados.resultadoUserEmailSended.isSended}\n-> Admins: ${emailsEnviados.resultadoAdminEmailSended.isSended}` )

};

const ContruirEmailUsuario = async (resultadoInsercion, formulario, traduccion) =>
{

    const texto = traduccion["registro_confirmacion"]
        
        .replace(new RegExp("{A1}", "g"), formulario.nombre)
        .replace(new RegExp("{C1}", "g"), "RentCarMallorca")
        .replace(new RegExp("{D1}", "g"), formulario.descripcion_vehiculo)
        .replace(new RegExp("{E1}", "g"), formulario.fechaRecogida)
        .replace(new RegExp("{E3}", "g"), formulario.horaRecogida)
        .replace(new RegExp("{F1}", "g"), formulario.fechaDevolucion)
        .replace(new RegExp("{E4}", "g"), formulario.horaDevolucion)
        .replace(new RegExp("{G1}", "g"), resultadoInsercion.numeroRegistro)
        .replace(new RegExp("{D2}", "g"), formulario.numero_sillas_nino)
        .replace(new RegExp("{D3}", "g"), formulario.numero_booster)
        .replace(new RegExp("{Z3}", "g"), `<img src="${descripcionVehiculos[formulario.descripcion_vehiculo]}">`)
        .replace(new RegExp("{Z4}", "g"), `<a href="https://www.google.com/maps/place/Cam%C3%AD+de+Can+Pastilla,+51,+07610+Can+Pastilla,+Illes+Balears/@39.538882,2.71428,15z/data=!4m5!3m4!1s0x1297941e14ebb901:0x269d00f6b5ad9230!8m2!3d39.5388821!4d2.7142801?hl=es"><img src="https://www.rentcarmallorca.es/img/imagenlocalizacion.webp" width="200"></a>`)
        .replace(new RegExp("{H1}", "g"), "servicios@rentcarmallorca.es")
        .replace(new RegExp("{J1}", "g"), "Camino de Can Pastilla, 51")
        .replace(new RegExp("{K1}", "g"), "07610 Can Pastilla - Palma de Mallorca")
    ;
    
    const bodyConfirmacionEmail = htmlEmail
        .replace("0000", "https://www.rentcarmallorca.es/")
        .replace("XXXXXX", texto)
    ;

    let bodyEmail = 
    {
        from: 
        {
            name: "RentCarMallorca.es Servicios",
            address: `${EMAIL_ADMIN_RECIBIR_RESERVAS_1}`
        },
        to: `${formulario.email}`,
        subject: `${traduccion.suregistro} ${resultadoInsercion.numeroRegistro}`,
        html: `${bodyConfirmacionEmail}`,

    };


    return bodyEmail;

};

const ConstruirEmailAdmins = async (resultadoInsercion, formulario) =>
{

    let tabla = "";

    for (const key in formulario)
    {
        if (key === "token" || key === "useragent" || key === "location") continue;
        
        tabla += `
        <tr>
            <th>${key}</th>
            <th>${formulario[key]}</th>
        </tr>`;

    }

    let errorEmailSended = "";
    let subject = `Numero Registro: ${resultadoInsercion.numeroRegistro}`;
    if (formulario.isUserEmailSended === false) {
        // mostrar error en el correo
        errorEmailSended = `ATENCION!!!! Ha habido un error al enviar correo al usuario ${formulario.email}`;
        subject = `Problemas! El Numero Registro: ${resultadoInsercion.numeroRegistro} tiene problemas`;

    }

    let html = 
`
<!DOCTYPE html>
<html>
<head>
<style>
#customers {
  font-family: Arial, Helvetica, sans-serif;
  border-collapse: collapse;
  width: 100%;
}

#customers td, #customers th {
  border: 1px solid #ddd;
  padding: 8px;
}

#customers tr:nth-child(even){background-color: #f2f2f2;}

#customers tr:hover {background-color: #ddd;}

#customers th {
  padding-top: 12px;
  padding-bottom: 12px;
  text-align: left;
  background-color: #04AA6D;
  color: white;
}

a
{
    color: black;
}

</style>
</head>
<body>
${errorEmailSended}
Ha llegado una reserva nueva con el numero registro ${resultadoInsercion.numeroRegistro} con los siguientes datos
<br>
<table id="customers">
  ${tabla}
</table>
</body>
</html>
`;

    let bodyEmail =
    {
        from: `${EMAIL_ADMIN_RECIBIR_RESERVAS_1}`,
        to: [`${EMAIL_ADMIN_RECIBIR_RESERVAS_1}`, `${EMAIL_ADMIN_RECIBIR_RESERVAS_2}` ],
        subject: `${subject}`,
        html: `${html}`
    };

    return bodyEmail;

};


exports.EnviarCorreoAh = async (data) =>
{

    const result = await EnviarCorreoIo(data);
    const datos = {
        "datosEmailConfirmacionReserva": result,
    };

    return datos;


};

const EnviarCorreoIo = async (data) =>
{

    let isSended = false;
    let incrementalCount = 1;
    let resultadoEnvioEmail =
    {
        "isSended": false,
        "messageId": 0,
        "cannotSend": false
    };

    while (isSended === false) {

        const responseRaw = await transporter.sendMail(data);

        if (responseRaw.messageId !== undefined) {
            
            isSended = true;
            resultadoEnvioEmail["isSended"] = true;
            resultadoEnvioEmail["messageId"] = responseRaw.messageId;
            
        }
        else {
            await sleep(5000 * incrementalCount);
            incrementalCount++;
        }

        if (incrementalCount >= 10) {
            resultadoEnvioEmail["cannotSend"] = true;
            break;
        }
    }

    return resultadoEnvioEmail;



};


// const EnviarCorreoApiJet = async (uri, data) =>
// {

//     let isSended = false;
//     let incrementalCount = 1;
//     let resultadoEnvioEmail =
//     {
//         "isSended": false,
//         "messageId": 0,
//         "messageUUID": 0,
//         "cannotSend": false
//     };
    
   

//     while (isSended === false)
//     {
//         const responseRaw = await fetch(uri, data);

//         const emailIsSended = await responseRaw.json();
//         if (emailIsSended.Messages.length > 0)
//         {
//             if (emailIsSended.Messages[0].Status === "success")
//             {
//                 isSended = true;
//                 resultadoEnvioEmail["isSended"] = true ;
//                 resultadoEnvioEmail["messageId"] = emailIsSended.Messages[0].To[0].MessageID;
//                 resultadoEnvioEmail["messageUUID"] = emailIsSended.Messages[0].To[0].MessageUUID;
//             }
//         }
//         else 
//         {
//             await sleep(5000 * incrementalCount);
//             incrementalCount++;
//         }

//         if (incrementalCount >= 10)
//         {
//             resultadoEnvioEmail["cannotSend"] = true;
//             break;
//         }
//     }

//     return resultadoEnvioEmail;

// };


//2020-01-07T11:28:03.588+00:00
const ObtenerCurrentDate = async () =>
{
    let date_ob = new Date();

    const dia = date_ob.getUTCDate().toString().padStart(2, "00");
    const mes = (date_ob.getUTCMonth() + 1).toString().padStart(2, "00");
    const anyo = date_ob.getUTCFullYear();

    const hora = date_ob.getUTCHours().toString().padStart(2, "00");
    const minutos = date_ob.getUTCMinutes().toString().padStart(2, "00");
    const segundos = date_ob.getUTCSeconds().toString().padStart(2, "00");;
    // const ms = date_ob.getUTCMilliseconds().toString().padStart(2, "00");

    // const cadena = `${anyo}-${mes}-${dia}T${hora}:${minutos}:${segundos}:${ms}`;
    const cadena = `${anyo}-${mes}-${dia}T${hora}:${minutos}:${segundos}`;

    return cadena;

};


const ObtenernumeroRegistro = async () =>
{

    let date_ob = new Date();
    const dia = date_ob.getDate().toString().padStart(2, "00");
    const mes = (date_ob.getMonth() + 1).toString().padStart(2, "00");
    const anyo = date_ob.getFullYear();

    const idRandom = nanoid.nanoid().substring(0, 3).toUpperCase();
    let numeroRegistro = `${idRandom}${anyo}${mes}${dia}`;

    // comprobar que no exista el numero
    const existe = await dbInterfaces.ConsultarLocalizador(numeroRegistro);

    if (existe === true)
    {
        numeroRegistro = await ObtenernumeroRegistro();
    }

    return numeroRegistro;

};

exports.ProcesarReserva = async (formulario, currentDate) =>
{

    formulario = await SanitizarFormulario(formulario);
    
    const numeroRegistro = await ObtenernumeroRegistro();
    formulario["numeroRegistro"] = numeroRegistro;
    formulario["emailConfirmacionReservaEnviado"] = false;
    
    const isReservaValida = await CheckReservaValida(formulario);
    if (isReservaValida === false)
    {
        return { "isInserted": false, "objectId": undefined, "numeroRegistro": numeroRegistro };
    }

    const merchantPayment = await this.CreateMerchantPayment(
        formulario,
        process.env.MERCHANT_CODE,
        process.env.MERCHANT_KEY_CODED
    );

    let isInserted = false;
    let incrementalCount = 1;
    while (isInserted === false)
    {
        result = await dbInterfaces.ProcesarReserva(formulario);
        isInserted = result.isInserted;
        if (isInserted === false)
        {
            await sleep(5000 * incrementalCount);
            incrementalCount++;
        }
    }


    return { 
        "isInserted": isInserted,
        "objectId": result.objectId,
        "numeroRegistro": numeroRegistro,
        "merchantPayment": merchantPayment
    };

};


const SanitizarFormulario = async (formulario) =>
{
    
    //quitar mayusculas, espacios, o caracteres no permitidos
    formulario["nombre"] = await CapitalizarString(formulario["nombre"]);
    formulario["apellidos"] = await CapitalizarString(formulario["apellidos"]);

    formulario["email"] = formulario["email"].trim().toLowerCase();
    formulario["telefono"] = formulario["telefono"].trim().toLowerCase();

    return formulario;

};

const CapitalizarString = async (cadena) =>
{

    const palabras = cadena.toLowerCase().split(" ");

    for (let i = 0; i < palabras.length; i++) {
        palabras[i] = palabras[i][0].toUpperCase() + palabras[i].substr(1);
    }

    const texto = palabras.join(" ");
    return texto;

};


const sleep = async (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

};


exports.CheckTokenPostForm = async (formulario) => {

    const schema = Joi.object({
        token: Joi.string().required(),
        useragent: Joi.object().required(),
        location: Joi.object().required(),
        descripcion_vehiculo: Joi.string().required(),
        fechaRecogida: Joi.string().required(),
        horaRecogida: Joi.string().required(),
        fechaDevolucion: Joi.string().required(),
        horaDevolucion: Joi.string().required(),
        dias: Joi.number().required(),
        alquiler: Joi.number().required(),
        conductor_con_experiencia: Joi.string().required(),
        total_suplmento_tipo_conductor: Joi.number().required(),
        pagoRecogida: Joi.number().required(),
        pago_online: Joi.number().required(),
        trato: Joi.string().required(),
        numero_sillas_nino: Joi.number().required(),
        numero_booster: Joi.number().required(),
        nombre: Joi.string().required(),
        apellidos: Joi.string().required(),
        email: Joi.string().required(),
        telefono: Joi.string().required(),
        idioma: Joi.string().required(),
        

    });

    const [respuesta, formularioChecked] = await CheckTokenControlSchema(formulario, schema);

    return [respuesta, formularioChecked];

};

const CheckTokenControlSchema = async (formulario, schema) => {

    let respuesta = {};

    const isTokenValid = await CheckToken(formulario.token, dbInterfaces.tokenFromFrontend);
    respuesta["isTokenValid"] = isTokenValid;

    if (isTokenValid === false) {
        return [respuesta, formulario];
    }

    // TODO: generar string a partir del secreto
    formulario["token"] = await GenerateTokenBackendToFrontend();
    if (formulario.conductor_con_experiencia === undefined) {
        formulario["conductor_con_experiencia"] = "off";
    }

    const currentDate = await ObtenerCurrentDate();
    formulario["fechaAlta"] = currentDate;

    respuesta["isSchemaValid"] = await ControlSchema(formulario, schema);

    return [respuesta, formulario];

};


const CheckToken = async (token, tokenFromFrontend) => {

    let isValid = false;

    if (token === tokenFromFrontend) {
        isValid = true;
    }

    return isValid;
};

const ControlSchema = async (body, schema) => {

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

};

const CheckReservaValida = async (formulario) =>
{

    const dias = formulario.dias - 0;

    if (dias <= 0)
    {
        return false;
    }

    

    const datosVehiculo = await dbInterfaces.GetCarByDescripcion(formulario.descripcion_vehiculo);
    const allDatosSuplementoTipoChofer = await dbInterfaces.GetSuplementosTipoChofer();
    const preciosPorClase = await dbInterfaces.GetPreciosUnicaClase(datosVehiculo.resultados.clasevehiculo);
    
    const porcentajeTipoVehiculo = await dbInterfaces.GetPorcentajeTipoVehiculo();
    const formularioDescuento = porcentajeTipoVehiculo[datosVehiculo.resultados.clasevehiculo] - 0;

    const precioAlquiler = await obtenerPrecioSegunCantidadDias(dias, preciosPorClase.resultados);
    

    const precioPagoRecogida = (precioAlquiler * formularioDescuento) / 100 ;
    const precioPagoOnline = precioAlquiler - precioPagoRecogida;

    if (
        precioAlquiler === (formulario.alquiler - 0) && 
        precioPagoOnline === (formulario.pago_online - 0) &&
        precioPagoRecogida === (formulario.pagoRecogida - 0)
    )
    {
        return true;
    }


    return false;


};

const obtenerPrecioSegunCantidadDias = async (dias, preciosPorClase) =>
{

    let precio = 0;

    switch (dias) 
    {
        case 0:
            precio = 0;
        break;
        case 1:
            precio = preciosPorClase.PRECIO920 - 0;
        break;
        case 2: 
            precio = preciosPorClase.PRECIO2 - 0;
        break;
        case 3: 
            precio = preciosPorClase.PRECIO3 - 0;
        break;
        case 4: 
            precio = preciosPorClase.PRECIO4 - 0;
        break;
        case 5: 
            precio = preciosPorClase.PRECIO5 - 0;
        break;
        case 6: 
            precio = preciosPorClase.PRECIO6 - 0;
        break;
        case 7: 
            precio = preciosPorClase.PRECIO6 - 0;
        break;
        default:
            precio = (preciosPorClase.PRECIOMAS7 - 0) * dias;
        break;
    }

    return precio;
};

exports.CreateMerchantPayment = async (formulario, codigo, key) =>
{

    const amount = Number(formulario["pago_online"]).toFixed(2);

    const jsonMerchantParameters = 
    {
        
        "DS_MERCHANT_MERCHANTURL": `https://www.rentcarmallorca.es${process.env.ENDPOINT_NOTIFICACION_PAYGATEWAY}`,
        "DS_MERCHANT_URLKO": "https://www.rentcarmallorca.es/nocorrecto",
        "DS_MERCHANT_URLOK": "https://www.rentcarmallorca.es/correcto",
        "DS_MERCHANT_AMOUNT": amount.toString().replace(".", ""),
        "DS_MERCHANT_CURRENCY": "978",
        "DS_MERCHANT_MERCHANTCODE": codigo.toString(),
        "DS_MERCHANT_ORDER": formulario["numeroRegistro"].toString(),
        "DS_MERCHANT_TERMINAL": "1",
        "DS_MERCHANT_TRANSACTIONTYPE": "0"

    };

    const encodecSignature = await createMerchantSignature(process.env.MERCHANT_KEY_CODED, jsonMerchantParameters);
    const base64MerchantParameters = await createMerchantParameters(jsonMerchantParameters);

    return {
        "Ds_MerchantParameters": base64MerchantParameters,
        "Ds_Signature": encodecSignature,
        "Ds_SignatureVersion": "HMAC_SHA256_V1"
    };

};

exports.RecibeCodedMerchantParameters = async (merchantParameters) =>
{

    const decodedMerchantParameters = await decodeMerchantParameters(merchantParameters);
    
    return decodedMerchantParameters;

};


exports.BuscarReservaModificar = async (merchantParameters) =>
{

    let incrementalCount = 1;
    let isUpdated = false;
    let reserva = undefined;
    while (isUpdated === false)
    {
        [isUpdated, reserva] = await dbInterfaces.UpdateReservasByLocalizador(merchantParameters.Ds_Order, merchantParameters);
        
        if (isUpdated === false) {
            await sleep(5000 * incrementalCount);
            incrementalCount++;
        }
    }

    return reserva;

};


const encrypt3DES = async (str, key) =>
{
    const secretKey = Buffer.from(key, 'base64');
    const iv = Buffer.alloc(8, 0);
    const cipher = crypto.createCipheriv('des-ede3-cbc', secretKey, iv);
    cipher.setAutoPadding(false);
    const relleno = await zeroPad(str, 8);
    const en_key = cipher.update(relleno, 'utf8', 'binary') + cipher.final('binary');
    const maxPos = Math.ceil(str.length / 8) * 8;
    
    return Buffer.from(en_key.substr(0, maxPos), 'binary').toString('base64');
};



const decrypt3DES = async (str, key) => 
{
    const secretKey = Buffer.from(key, 'base64');
    const iv = Buffer.alloc(8, 0);
    const cipher = crypto.createDecipheriv('des-ede3-cbc', secretKey, iv);
    cipher.setAutoPadding(false);
    const relleno = await zeroUnpad(str, 8);
    const res = cipher.update(relleno, 'base64', 'utf8') + cipher.final('utf8');
    return res.replace(/\0/g, '');
};

const mac256 = async (data, key) =>
{
    return crypto.createHmac('sha256', Buffer.from(key, 'base64'))
        .update(data)
        .digest('base64');
};

const createMerchantParameters = async (data) => 
{
    return Buffer.from(JSON.stringify(data), 'utf8').toString('base64');
};

const decodeMerchantParameters = async (data) => {
    const decodedData = JSON.parse(base64url.decode(data, 'utf8'));
    const res = {};
    Object.keys(decodedData).forEach((param) => {
        res[decodeURIComponent(param)] = decodeURIComponent(decodedData[param]);
    });
    return res;
};

const createMerchantSignature = async (key, data) => 
{
    const merchantParameters = await createMerchantParameters(data);
    const orderId = data.DS_MERCHANT_ORDER;
    const orderKey = await encrypt3DES(orderId, key);

    return await mac256(merchantParameters, orderKey);
};

const createMerchantSignatureNotif = async (key, data) =>
{
    const merchantParameters = this.decodeMerchantParameters(data);
    const orderId = merchantParameters.Ds_Order || merchantParameters.DS_ORDER;
    const orderKey = await encrypt3DES(orderId, key);

    const res = await mac256(data, orderKey);
    return base64url.encode(res, 'base64');
};


const zeroPad = async (buf, blocksize) =>
{
    const buffer = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf;
    const pad = Buffer.alloc((blocksize - (buffer.length % blocksize)) % blocksize, 0);
    return Buffer.concat([buffer, pad]);
};


const zeroUnpad = async (buf, blocksize) =>
{
    let lastIndex = buf.length;
    while (lastIndex >= 0 && lastIndex > buf.length - blocksize - 1) {
        lastIndex -= 1;
        if (buf[lastIndex] !== 0) {
            break;
        }
    }
    return buf.slice(0, lastIndex + 1).toString('utf8');
};


//----------






exports.SumarVisitaVehiculo = async (vehiculo) =>
{

    const resultado = await dbInterfaces.SumarVisitaVehiculo(vehiculo);
    return resultado;

};


exports.A??adirEstadisticas = async (formulario) =>
{

    const resultado = await logicStats.A??adirEstadisticas(formulario);
    
};



exports.ActualizarEstadisticas = async (formulario) => {

    const resultado = await logicStats.ActualizarEstadisticas(formulario);


    // const resultado = await logicStats.ActualizarEstadisticas(formulario);



};
