const { delay } = require("../utils/common");
const axios = require("axios");
const https = require("https");
const forge = require("node-forge");
const { sha3_512 } = require("js-sha3");

const encryptSHA3 = async (data) => {
  // Encriptar los datos usando SHA3-512
  const hashHex = sha3_512(data);

  return hashHex;
};

const encryptRSA = async (publicKeyPem, data) => {
  // Convertir la clave pública PEM a un objeto de clave pública
  const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);

  // Encriptar los datos usando OAEP con SHA-1 y MGF1
  const encryptedData = publicKey.encrypt(data, "RSA-OAEP", {
    md: forge.md.sha1.create(),
    mgf1: {
      md: forge.md.sha1.create(),
    },
  });

  // Convertir los datos encriptados a una cadena en base64
  const encryptedBase64 = forge.util.encode64(encryptedData);

  return encryptedBase64;
};

const login = async (params) => {
  const { email, password } = params;
  var publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwFt0gwidIq1VL0f4KOMZghS0Nq6a4leajz7AQjNK/J3ILdf0k840afihFami0qXQ90W3qZ3qnxbHwb6ugXSMT4iMxMjHTwmBMGteK46Hr/4J3CR6npSV8sFNHr5Cbc3s95SVBNJB0O4uv6Nrl4nMJ5gjX6DlO0bojAvqB6TZ4l40SZiSLJ+ZPEGlyqzf/5utMZIBwxgBSd/5GgtfwlSnBA49zZeLoetktNVWYKAczFm3ThYZZVBUg5iyYJRjh+VfzkOPt50bF2TxXGv73eoHJ9nLPCtRxef1h4x5aJkWgfisrvvtOyigVDVrgaDgADdr0XAJAsEbTcHDxURvO9v1RwIDAQAB
-----END PUBLIC KEY-----`; //your public key
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
    //console.log("REQUEST:", response.request);
    //console.log("Datos recibidos:", response.data);
    console.debug(response.data);
    return response.data;
  } catch (error) {
    console.error("Error al realizar la solicitud:", error);
    return error;
  }

  console.debug(encrypted);
  return encrypted.toString("base64");
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

module.exports = {
  Consulta_Cartilla,
  login,
};
