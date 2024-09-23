const { delay } = require("../utils/common");
const axios = require("axios");
const https = require("https");
const fs = require("fs").promises;
const { encryptRSA, decryptRSA, encryptSHA3 } = require("../utils/crypto");
const { transformDateToIso } = require("../utils/common");
const { socialPlans } = require("../utils/constants");

const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwFt0gwidIq1VL0f4KOMZghS0Nq6a4leajz7AQjNK/J3ILdf0k840afihFami0qXQ90W3qZ3qnxbHwb6ugXSMT4iMxMjHTwmBMGteK46Hr/4J3CR6npSV8sFNHr5Cbc3s95SVBNJB0O4uv6Nrl4nMJ5gjX6DlO0bojAvqB6TZ4l40SZiSLJ+ZPEGlyqzf/5utMZIBwxgBSd/5GgtfwlSnBA49zZeLoetktNVWYKAczFm3ThYZZVBUg5iyYJRjh+VfzkOPt50bF2TxXGv73eoHJ9nLPCtRxef1h4x5aJkWgfisrvvtOyigVDVrgaDgADdr0XAJAsEbTcHDxURvO9v1RwIDAQAB
-----END PUBLIC KEY-----`; //your public key

const login = async (params) => {
  const { email, password } = params;
  const encryptedEmail = await encryptRSA(publicKey, email);
  const encryptedPassword = await encryptSHA3(password);
  console.debug(encryptedEmail);
  console.debug(encryptedPassword);

  try {
    const baseUrl = `http://osiris.hms-tech.com:10100`;

    const instance = axios.create({
      baseURL: baseUrl,
    });
    instance.defaults.httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    const data = {
      person: {
        ids: {
          emails: {
            value: encryptedEmail,
          },
        },
      },
      person_domain: "HMS",
      password: encryptedPassword,
      token: {
        expiration_duration: "PT10M",
      },
    };

    const response = await instance.post(
      `/api/auth2/domain/hms/environment/test/authenticate/identifier?apikey=kO2Ntii7I7d8SzxnYZGsckNmTUZAdZ1b`,
      data
    );

    return await transformApiResponse(response);
  } catch (error) {
    console.error("Error al realizar la solicitud:", error);
    return error;
  }
};

const Consulta_Cartilla = async (params) => {
  console.log("PARAMS", params);
  const { plan, region, speciality = "86" } = params;
  try {
    const baseUrl = `https://servicios.scisonline.com.ar:10100`;

    console.log("Consultando Cartilla");
    const instance = axios.create({
      baseURL: baseUrl,
    });
    instance.defaults.httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });
    const response = await instance.get(
      `/api/cartilla/domain/scis/plan/${plan}/specialty/${speciality}/region/${region}?apikey=zOD9sW2OCOeFriPMuhnbVawzh63qDc08`
    );
    //console.log("REQUEST:", response.request);
    //console.log("Datos recibidos:", response.data);

    const result = response.data.map((item) => {
      return {
        name: item.name,
        email: item.email,
        horario: item.schedule,
        direccion: `${item.street} ${item.number_street} ${item.number_street}, ${item.city}`,
        mapa: `https://www.google.com/maps?q=${item.latitude},${item.longitude}&hl=es&z=15`,
        telefonos: `${item.tel1} ${item.tel2} ${item.tel3}`,
      };
    });

    return `En la region ${region} se encontraron: ${JSON.stringify(result)}`;
  } catch (error) {
    console.error("Error al realizar la solicitud:", error);
    return error;
  }
};

const Consulta_Coseguros = async (params) => {
  console.log("PARAMS", params);

  const { plan } = params;

  try {
    // Leer el archivo JSON de manera asíncrona
    const data = await fs.readFile("./Archivos/Coseguros.json", {
      encoding: "utf-8",
    });

    // Parsear el contenido JSON
    const jsonData = JSON.parse(data);

    // Filtrar registros donde "SC100" exista y su valor no sea vacío
    const filteredData = jsonData.filter(
      (item) => item[plan] && item[plan].trim() !== ""
    );

    // Mapear los resultados a un nuevo array con las columnas deseadas
    const result = filteredData.map((item) => ({
      seccion: item.Seccion,
      subseccion: item.Subseccion,
      titulo: item.Titulo,
      coseguro: item[plan],
    }));

    // Retornar el array resultante
    return result;
  } catch (err) {
    console.error("Error:", err);
    throw err; // Lanza el error para que pueda ser manejado por quien llama a la función
  }
};

const transformApiResponse = async (response) => {
  const {
    data: { person },
  } = response;

  const dniEncrypted = person.document_ids.find((x) => x.type === "DNI").value;
  const dni = (await decryptRSA(publicKey, dniEncrypted)).toString("utf8");
  const fechaDeCumpleanios = person.birth_date;
  const fechaDeCumpleaniosValida = transformDateToIso(fechaDeCumpleanios);
  const nombre = person.first_name;
  const apellido = person.last_name;
  const emailsEncrypted = person.emails.map((x) => x.value);
  const emails = await Promise.all(
    emailsEncrypted.map((email) =>
      decryptRSA(publicKey, email).then((x) => x.toString("utf8"))
    )
  );

  const cuilEncrypted = person.document_ids.find(
    (x) => x.type === "CUIT/CUIL"
  ).value;

  const cuil = (await decryptRSA(publicKey, cuilEncrypted)).toString("utf8");

  const perfiles = person.profiles.map((x) => x.name);

  const planes = perfiles
    .map((x) => x.match(/^([^@]+)/)?.[0])
    .filter((x) =>
      socialPlans.map((x) => x.toLowerCase()).includes(x.toLowerCase())
    )
    .map((x) => x.toUpperCase());

  // hay mas de uno ... con cual me quedo ? por ahora me quedo con el primero
  const idAfiliadoEncrypted = person.external_ids[0].value;
  const idAfiliado = (
    await decryptRSA(publicKey, idAfiliadoEncrypted)
  ).toString("utf8");

  return {
    dni,
    fechaDeCumpleanios: fechaDeCumpleaniosValida,
    nombre,
    apellido,
    emails,
    cuil,
    planes,
    idAfiliado,
  };
};

module.exports = {
  Consulta_Cartilla,
  Consulta_Coseguros,
  login,
};
