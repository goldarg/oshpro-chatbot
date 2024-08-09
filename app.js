const {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
  EVENTS,
} = require("@bot-whatsapp-custom/bot");

const { downloadMedia } = require("./services/Meta");
const medicamentos = require("./Archivos/Medicamentos.json");
const { init } = require("bot-ws-plugin-openai");
const JsonFileAdapter = require("@bot-whatsapp/database/json");
const ChatGPTClass = require("./chatgpt.class");
const AssistantChat = require("./openai.class");
const { Consulta_Cartilla, login } = require("./services/HMS");
const {
  solicitarAutorizacionPlanMaternoInfantil,
  solicitarAutorizacionEstudiosYPracticas,
  solicitarAutorizacionMedicacionEspecial,
  solicitarAutorizacionInternacionesYCirugias,
  solicitarAutorizacionTrasladosMedicos,
} = require("./services/Vtiger");
const MetaProvider = require("@bot-whatsapp-custom/provider/meta");
const normalizeString = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};
const list_familiar_group = () => {
  return {
    1234567891236: "Agustin Lopez",
    1234567891235: "Ignacio Lopez",
  };
};

const consulta_medicamentos = async (params) => {
  const { plan, medicamento, es_materno_infantil, enfermedad_cronica } = params;
  let empadronado = es_materno_infantil || enfermedad_cronica ? "SI" : "NO";
  let pattern = "\b" + medicamento + "\b";
  const matcher = new RegExp(pattern, "gi");
  let filtered = await medicamentos.filter(
    (item) =>
      item.Plan.indexOf(plan.toUpperCase()) > -1 &&
      item.Requiere_Empadronamiento == empadronado &&
      (matcher.test(item.Principio_Activo) || matcher.test(item.medicamento))
  );
  if (filtered.length == 0) {
    let pattern = medicamento
      .split(" ")
      .map((item) => item.split("+"))
      .flat()
      .join("|");
    console.log("pattern", pattern);
    const matcher = new RegExp(pattern, "gi");
    filtered = await medicamentos.filter(
      (item) =>
        item.Plan.indexOf(plan.toUpperCase()) > -1 &&
        item.Requiere_Empadronamiento == empadronado &&
        (matcher.test(item.Principio_Activo) ||
          matcher.test(item.Medicamento) ||
          matcher.test(item.Enfermedad))
    );
  }

  return filtered || {};
};

const functions = {
  Identidad_Informacion_Usuario: login,
  Solicitar_Autorizacion_Plan_Materno_Infantil:
    solicitarAutorizacionPlanMaternoInfantil,
  Solicitar_Autorizacion_Estudios_Y_Practicas_en_Ambulatorio:
    solicitarAutorizacionEstudiosYPracticas,
  Solicitar_Autorizacion_Medicacion_Especial:
    solicitarAutorizacionMedicacionEspecial,
  Solicitar_Autorizacion_Internaciones_Y_O_Cirugias_Programadas: solicitarAutorizacionInternacionesYCirugias,
  Solicitar_Autorizacion_Traslados_Medicos: solicitarAutorizacionTrasladosMedicos,
  get_list_grupo_familiar: list_familiar_group,
  list_sales_plans: async () => {
    return {
      planes: [
        "SC50",
        "SC100",
        "SC150",
        "SC250",
        "SC300",
        "SC500",
        "SC550",
        "SC600",
        "SC4000",
      ],
    };
  },
  get_medicamentos: consulta_medicamentos,
  Consulta_Cartilla: Consulta_Cartilla,
};

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
};

const replaceAll = (str, find, replace) => {
  if (str === "") return;
  return str.replace(new RegExp(escapeRegExp(find), "g"), replace);
};

const Assistant = new AssistantChat(process.env.ASSISTANT_ID, functions);

const flowGPT = addKeyword(EVENTS.WELCOME).addAction(async (ctx, ctxFn) => {
  console.log(ctx);
  const response = await Assistant.sendMessage(ctx.from, ctx.body);
  await ctxFn.flowDynamic(replaceAll(response, "**", "*"));
});

const flowImages = addKeyword(EVENTS.MEDIA, EVENTS.DOCUMENT).addAction(
  async (ctx, ctxFn) => {
    console.log(JSON.stringify(ctx));
    const pathFile = await downloadMedia(ctx.url, ctx.body);
    const response = await Assistant.sendMessage(
      ctx.from,
      ctx.caption,
      pathFile
    );
    await ctxFn.flowDynamic(response);
  }
);

const main = async () => {
  const adapterDB = new JsonFileAdapter();

  const adapterFlow = createFlow([flowGPT, flowImages]);

  const adapterProvider = createProvider(MetaProvider, {
    jwtToken: process.env.META_TOKEN,
    numberId: process.env.TEST_NUMBER_ID,
    verifyToken: process.env.VERIFY_TOKEN,
    version: process.env.META_VERSION,
  });

  createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });
};

main();
