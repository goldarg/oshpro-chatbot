const { delay, generateRandomNumber } = require("../utils/common");
const axios = require("axios");
const https = require("https");

const DBAfiliados = {
  1234567891234: {
    nro: "1234567891234",
    dni: "123456",
    name: "Elbio Lopez",
    phone: "3487612943",
  },
};

const getAfiliadoInfo = async (number) => {
  await delay(1500);
  const afiliado = DBAfiliados[number];

  return afiliado;
};

const solicitarAutorizacionPlanMaternoInfantil = async (params) => {
  await delay(1500);
  return {
    numeroDeTramiteId: generateRandomNumber(100000, 999999),
        mensajeAdicional: "Se ha solicitado autorizacion para plan materno infantil, este puede demorar hasta 48 horas habiles"
  };
};

const solicitarAutorizacionEstudiosYPracticas = async (params) => {
    await delay(1500);

    const estaEnBuenosAires = params.estaEnBuenosAires;

    if (estaEnBuenosAires) {
        return {
            mensaje: "No necesita autorizacion para ordenes de laboratorio"
        };
    }

    return {
        numeroDeTramiteId: generateRandomNumber(100000, 999999),
        mensajeAdicional: "Se ha solicitado autorizacion para estudios y practicas, este puede demorar hasta 48 horas habiles"
    };
};

const solicitarAutorizacionMedicacionEspecial = async (params) => {
    await delay(1500);

    return {
        numeroDeTramiteId: generateRandomNumber(100000, 999999),
        mensajeAdicional: "Se ha solicitado autorizacion para medicacion especial, este puede demorar hasta 48 horas habiles"
    };
}

const solicitarAutorizacionInternacionesYCirugias = async (params) => {
    await delay(1500);

    return {
        numeroDeTramiteId: generateRandomNumber(100000, 999999),
        mensajeAdicional: "Se ha solicitado autorizacion para internaciones y cirugías, este puede demorar hasta 48 horas habiles"
    };
}

const solicitarAutorizacionTrasladosMedicos = async (params) => {
    await delay(1500);

    return {
        numeroDeTramiteId: generateRandomNumber(100000, 999999),
        mensajeAdicional: "Se ha solicitado autorizacion para traslados médicos, este puede demorar hasta 48 horas habiles"
    };
}

const getIntegrantes = async (afiliado) => {
  await setTimeout(() => {}, 1500);
  return ["Matias Garcia Rebaque", "Guillermo Markan"];
};

const createSolicitud = async (solicitud) => {
  console.log("creando solicitud");
  await delay(2000);
  console.log("creada");
  return "213131";
};

const getPlanes = async () => {
  console.log("Solicitando planes");
  const instance = axios.create({
    baseURL: `https://servicios.scisonline.com.ar:10100`,
  });
  instance.defaults.httpsAgent = new https.Agent({
    rejectUnauthorized: false,
  });
  const res = await instance.get(
    "/api/cartilla/domain/SCIS/plans?apikey=zOD9sW2OCOeFriPMuhnbVawzh63qDc08"
  );

  return res.data;
};

module.exports = {
  getAfiliadoInfo,
  getIntegrantes,
  createSolicitud,
  getPlanes,
  solicitarAutorizacionPlanMaternoInfantil,
  solicitarAutorizacionEstudiosYPracticas,
  solicitarAutorizacionMedicacionEspecial,
  solicitarAutorizacionInternacionesYCirugias,
  solicitarAutorizacionTrasladosMedicos
};
