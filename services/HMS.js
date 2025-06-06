const { delay } = require("../utils/common");
const axios = require("axios");
const https = require("https");
const fs = require("fs").promises;
const { encryptRSA, decryptRSA, encryptSHA3 } = require("../utils/crypto");
const { transformDateToIso } = require("../utils/common");
const { socialPlans } = require("../utils/constants");
const XLSX = require("xlsx");
const { response } = require("express");

const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvDFuWlVVZInn5/I6/nmIQ14LF4fcWov4u2jZbzkgSpUg9kpUwS8AKHZVqZiME0Z+YtAQKDdCp18XuRdl1XIdtd0O03K0ZJPXDtWk4RbUy8VZx20PZcKdzU6x6tq0auJAR4tgyoFupN5tIP4yDh5hymwVBMsMXtjVx7P+B+SbnhwP/NGsEcefbozJqTQhYvIY1rvn2r7NCp9h31AH1G97VznUsCJ7e63xEcGNBZlqPxVZqJOTU248vB36vzMdZ6TE+zJPevVXvEUyqx6V5xz7TxekHfddly8bWtOO+M1LZFx4sNuLs8v57I6IM1O07FOKur1TnKrNv0D08V3x3mtptQIDAQAB
-----END PUBLIC KEY-----`; //your public key

const newLogin = async (params) => {
  const { dni, password } = params;
  const encryptedDni = await encryptRSA(publicKey, dni);
  const encryptedPassword = await encryptSHA3(password);
  console.debug(encryptedDni);
  console.debug(encryptedPassword);

  try {
    const baseUrl = `https://test01.scisonline.com.ar`;

    const instance = axios.create({
      baseURL: baseUrl,
    });
    instance.defaults.httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    const data = {
      person: {
        ids: {
          document_ids: {
            country_code: "ar",
            type: "DNI",
            value: encryptedDni,
          },
        },
      },
      person_domain: "scis",
      password: encryptedPassword,
      token: {
        expiration_duration: "PT3M",
      },
    };

    const response = await instance.post(
      `/v2/api/auth2/domain/scis/environment/testV2/authenticate/identifier?apikey=zOD9sW2OCOeFriPMuhnbVawzh63qDc08`,
      data
    );

    const {
      data: {
        person: { relations },
      },
    } = response;

    if (relations && relations.length > 0) {
      const relationsToSend = relations.filter((person) =>
        person.relation.some((r) =>
          r.relation?.toUpperCase().includes("FAMILIAR")
        )
      );
      const responseRelaciones = await instance.post(
        `/v2/api/people_v2/domain/HMS/findPersonsByIdentifier?apikey=zOD9sW2OCOeFriPMuhnbVawzh63qDc08`,
        relationsToSend
      );

      const dataRelaciones = getDataPersonsFromResponse(responseRelaciones);

      return await transformApiResponse(response, dataRelaciones);
    }

    return await transformApiResponse(response, undefined);
  } catch (error) {
    console.error("Error al realizar la solicitud:", error);
    return "Error, credenciales invalidas";
  }
};

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

const Consulta_Ciudades_en_Region = async (params) => {
  const { region } = params;
  const baseUrl = `https://servicios.scisonline.com.ar:10100`;

  console.log("Consultando Cartilla");
  const instance = axios.create({
    baseURL: baseUrl,
  });
  instance.defaults.httpsAgent = new https.Agent({
    rejectUnauthorized: false,
  });

  const responseCity = await instance.get(
    `/api/places/country/ARGENTINA/region/${region}?apikey=zOD9sW2OCOeFriPMuhnbVawzh63qDc08`
  );

  let resultCity = responseCity.data.map((item) => item.city_ascii);

  return "ciudades en {region} son: " + JSON.stringify(resultCity);
};

const Consulta_Cartilla = async (params) => {
  console.log("PARAMS", params);
  let { plan, region, speciality, city, continuationToken } = params;
  const baseUrl = `https://servicios.scisonline.com.ar:10100`;
  let skip = 0;
  const take = 6;
  let page = 1;

  console.log("Consultando Cartilla");
  const instance = axios.create({
    baseURL: baseUrl,
  });
  instance.defaults.httpsAgent = new https.Agent({
    rejectUnauthorized: false,
  });

  if (continuationToken) {
    const tokenParams = decodificarContinuationToken(continuationToken);
    region = tokenParams.region;
    speciality = tokenParams.speciality;
    plan = tokenParams.plan;
    city = tokenParams.city;
    skip = tokenParams.skip;
    page = tokenParams.page;
  }

  if (city !== undefined && city !== null && city !== "") {
    const responseCity2 = await instance.get(
      `/api/places/country/ARGENTINA/region/${region}?apikey=zOD9sW2OCOeFriPMuhnbVawzh63qDc08`
    );

    let resultCity2 = responseCity2.data.map((item) => item.city_ascii);

    if (!resultCity2.includes(city.toUpperCase())) {
      return `La ciudad ${city} no se encuentra en la region ${region}, las ciudades disponibles son: ${JSON.stringify(
        resultCity2
      )}`;
    }
  }

  const workbookEspecialidades = XLSX.readFile("./Archivos/HMS_Cartilla.xlsx");
  const worksheet =
    workbookEspecialidades.Sheets["Especialidades seccion Matias"];
  const datos = XLSX.utils.sheet_to_json(worksheet, {
    range: "A1:D156",
    header: 1,
  });

  const headers = datos[0];

  const rows = datos.slice(1);

  const resultEsp = rows.map((row) => {
    let obj = {};
    row.forEach((value, index) => {
      obj[headers[index]] = value;
    });
    return obj;
  });

  const especialidad = resultEsp.find((x) => x["Nombre"] === speciality)[
    "Codigo"
  ];

  try {
    const response =
      city === undefined || city === null || city === ""
        ? await instance.get(
            `/api/cartilla/domain/scis/plan/${plan}/specialty/${especialidad}/region/${region.replace(
              "CIUDAD AUTONOMA DE BUENOS AIRES",
              "CAPITAL FEDERAL"
            )}?apikey=zOD9sW2OCOeFriPMuhnbVawzh63qDc08`
          )
        : await instance.get(
            `/api/cartilla/domain/scis/plan/${plan}/specialty/${especialidad}/region/${region.replace(
              "CIUDAD AUTONOMA DE BUENOS AIRES",
              "CAPITAL FEDERAL"
            )}/city/${city.toUpperCase()}?apikey=zOD9sW2OCOeFriPMuhnbVawzh63qDc08`
          );

    let dataALeer = response.data;

    if (dataALeer.length === 0 && city) {
      const responseY = await instance.get(
        `/api/cartilla/domain/scis/plan/${plan}/specialty/${especialidad}/region/${region.replace(
          "CIUDAD AUTONOMA DE BUENOS AIRES",
          "CAPITAL FEDERAL"
        )}/city/${city.toUpperCase()} CIUDAD?apikey=zOD9sW2OCOeFriPMuhnbVawzh63qDc08`
      );

      dataALeer = responseY.data;
    }

    if (speciality == "GUARDIA 24HS") {
      const especialidad2 = resultEsp.find(
        (x) => x["Nombre"] === "GUARDIA ADULTOS"
      )["Codigo"];

      let responseX =
        city === undefined || city === null || city === ""
          ? await instance.get(
              `/api/cartilla/domain/scis/plan/${plan}/specialty/${especialidad2}/region/${region.replace(
                "CIUDAD AUTONOMA DE BUENOS AIRES",
                "CAPITAL FEDERAL"
              )}?apikey=zOD9sW2OCOeFriPMuhnbVawzh63qDc08`
            )
          : await instance.get(
              `/api/cartilla/domain/scis/plan/${plan}/specialty/${especialidad2}/region/${region.replace(
                "CIUDAD AUTONOMA DE BUENOS AIRES",
                "CAPITAL FEDERAL"
              )}/city/${city.toUpperCase()}?apikey=zOD9sW2OCOeFriPMuhnbVawzh63qDc08`
            );

      if (responseX.data.length === 0 && city) {
        responseX = await instance.get(
          `/api/cartilla/domain/scis/plan/${plan}/specialty/${especialidad2}/region/${region.replace(
            "CIUDAD AUTONOMA DE BUENOS AIRES",
            "CAPITAL FEDERAL"
          )}/city/${city.toUpperCase()} CIUDAD?apikey=zOD9sW2OCOeFriPMuhnbVawzh63qDc08`
        );
      }

      dataALeer = dataALeer.concat(responseX.data);
    }

    //console.log("REQUEST:", response.request);
    //console.log("Datos recibidos:", response.data);

    let result = dataALeer.map((item, index) => {
      return {
        name: item.name,
        email: item.email,
        horario: item.schedule,
        direccion: `${item.street} ${item.number_street} ${item.number_street}, ${item.city}`,
        mapa: `https://www.google.com/maps?q=${item.latitude},${item.longitude}&hl=es&z=15`,
        telefonos: `${item.tel1} ${item.tel2} ${item.tel3}`,
        index,
      };
    });

    if (
      result.length > 30 &&
      (city === undefined || city === null || city === "")
    ) {
      const responseCity = await instance.get(
        `/api/places/country/ARGENTINA/region/${region}?apikey=zOD9sW2OCOeFriPMuhnbVawzh63qDc08`
      );

      let resultCity = responseCity.data.map((item) => item.city_ascii);

      if (resultCity.length > 0)
        return `Hay mas resultados de los que puedo mostrar, por favor volve a llamar a esta funcion sabiendo que las ciudades disponibles para la region ${region} son: ${JSON.stringify(
          resultCity
        )}`;
    }

    const cantidadRegistros = result.length;

    result = result.slice(skip, skip + take);

    let nuevoContinuationToken = null;

    if (skip + take < cantidadRegistros) {
      nuevoContinuationToken = generarContinuationToken({
        region,
        speciality,
        plan,
        city,
        skip: skip + take,
        page: page + 1,
      });
    }

    return {
      registros: result,
      continuationToken: nuevoContinuationToken,
      paginaActual: page,
      totalPaginas: Math.ceil(cantidadRegistros / take),
      cantidadRegistros,
    };

    // return `En la region ${region} se encontraron (si vas a truncar la respuesta al darla al usuario siempre aclarale que hay mas): ${JSON.stringify(
    //   result
    // )}`;
  } catch (error) {
    console.error("Error al realizar la solicitud:", error);
    return error;
  }
};

const Consulta_Coseguros = async (params) => {
  console.log("PARAMS", params);

  const { plan: planWithoutLabel, esOSPEDYC } = params;

  const obraSocial = esOSPEDYC ? "OSPEDYC" : "GENERAL";

  const plan = `Plan ${planWithoutLabel}`;

  const data = await fs.readFile("./Archivos/Copagos2.json", {
    encoding: "utf-8",
  });

  const jsonData = JSON.parse(data);

  const registros = jsonData[`Obra Social - ${obraSocial}`];
  if (!registros) {
    console.error("Obra social no encontrada.");
    return null;
  }

  const resultado = {};

  for (const [categoria, planes] of Object.entries(registros)) {
    if (planes[plan] !== undefined) {
      resultado[categoria] = planes[plan];
    }
  }

  return resultado;
};

const getDataPersonsFromResponse = (response) => {
  const { data } = response;

  const resultado = data.map((persona) => ({
    nombre: persona.first_name,
    apellido: persona.last_name,
    email: persona.emails[0]?.value || null,
    dni: persona.document_ids.find((doc) => doc.type === "DNI")?.value || null,
    idAfiliado: persona.external_ids[0]?.value || null,
    fechaDeCumpleanios: transformDateToIso(persona.birth_date) || null,
  }));

  return resultado;
};

const transformApiResponse = async (response, grupoFamiliar) => {
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
    (x) => (x.type === "CUIT/CUIL" || x.type === "DNI")
  ).value;

  const cuil = (await decryptRSA(publicKey, cuilEncrypted)).toString("utf8");

  const perfiles = person.profiles.map((x) => x.name);

  let planes = perfiles
    .map((x) => x.match(/^([^@]+)/)?.[0])
    .filter((x) =>
      socialPlans.map((x) => x.toLowerCase()).includes(x.toLowerCase())
    )
    .map((x) => x.toUpperCase());

  if (planes.length === 0) {
    planes = ["SC250"];
  }

  // hay mas de uno ... con cual me quedo ? por ahora me quedo con el primero
  const idAfiliadoEncrypted = person.external_ids?.[0]?.value;
  const idAfiliado = idAfiliadoEncrypted
    ? (await decryptRSA(publicKey, idAfiliadoEncrypted)).toString("utf8")
    : "5043900";

  return {
    dni,
    fechaDeCumpleanios: fechaDeCumpleaniosValida,
    nombre,
    apellido,
    emails,
    cuil,
    planes,
    idAfiliado,
    ...(grupoFamiliar && { grupoFamiliar }),
  };
};

function decodificarContinuationToken(token) {
  const params = JSON.parse(Buffer.from(token, "base64").toString("ascii"));
  return params;
}

function generarContinuationToken(params) {
  const token = Buffer.from(JSON.stringify(params)).toString("base64");
  return token;
}

module.exports = {
  Consulta_Cartilla,
  Consulta_Coseguros,
  Consulta_Ciudades_en_Region,
  login,
  newLogin,
};
