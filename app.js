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
const {
  Consulta_Cartilla,
  Consulta_Coseguros,
  Consulta_Ciudades_en_Region,
  login,
  newLogin,
} = require("./services/HMS");
const {
  solicitarAutorizacionPlanMaternoInfantil,
  solicitarAutorizacionEstudiosYPracticas,
  solicitarAutorizacionMedicacionEspecial,
  solicitarAutorizacionInternacionesYCirugias,
  solicitarAutorizacionTrasladosMedicos,
} = require("./services/Vtiger");
const MetaProvider = require("@bot-whatsapp-custom/provider/meta");
const XLSX = require("xlsx");
const { Server } = require("http");
const {
  HttpTransportType,
  HubConnectionBuilder,
  LogLevel,
} = require("@microsoft/signalr");

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

  if (es_materno_infantil) {
    const vademecum = XLSX.readFile(
      "./Archivos/Vademeìcum Plan Materno Infantil 5.xlsx"
    );
    const sheet = vademecum.Sheets["Sheet1"];
    const datos = XLSX.utils.sheet_to_json(sheet, {
      range: "A1:Q1130",
      header: 1,
    });

    const headers = datos[0];

    const rows = datos.slice(1);

    const result = rows.map((row) => {
      let obj = {};
      row.forEach((value, index) => {
        obj[headers[index]] = value;
      });
      return obj;
    });

    let patternExcel = "\b" + medicamento + "\b";
    const matcherExcel = new RegExp(patternExcel, "gi");
    let filteredExcel = await result.filter(
      (item) =>
        matcherExcel.test(item["Principio Activo"]) ||
        matcherExcel.test(item["Producto"])
    );

    if (filteredExcel.length == 0) {
      let patternExcel = medicamento
        .split(" ")
        .map((item) => item.split("+"))
        .flat()
        .join("|");
      console.log("pattern", patternExcel);
      const matcherExcel = new RegExp(patternExcel, "gi");
      filteredExcel = await result.filter(
        (item) =>
          matcherExcel.test(item["Principio Activo"]) ||
          matcherExcel.test(item["Producto"])
      );

      const datos = filteredExcel.map((item) => ({
        medicamento: item["Producto"],
        presentacion: item["Presentación"],
        principio_activo: item["Principio Activo"],
        laboratorio: item["Laboratorio"],
        familia: item["Familia AFB"],
        receta: item["Tipo Receta"],
        porcentaje_cobertura: item["%Cob. Perfil"],
        es_para_la: item["Cód. Perfil"] == "M" ? "Madre" : "Hijo",
      }));

      return datos || {};
    }
  }

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
  Identidad_Informacion_Usuario: newLogin,
  Solicitar_Autorizacion_Plan_Materno_Infantil:
    solicitarAutorizacionPlanMaternoInfantil,
  Solicitar_Autorizacion_Estudios_Y_Practicas_en_Ambulatorio:
    solicitarAutorizacionEstudiosYPracticas,
  Solicitar_Autorizacion_Medicacion_Especial:
    solicitarAutorizacionMedicacionEspecial,
  Solicitar_Autorizacion_Internaciones_Y_O_Cirugias_Programadas:
    solicitarAutorizacionInternacionesYCirugias,
  Solicitar_Autorizacion_Traslados_Medicos:
    solicitarAutorizacionTrasladosMedicos,
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
  Consulta_Coseguros: Consulta_Coseguros,
  Consulta_Ciudades_en_Region: Consulta_Ciudades_en_Region,
};

function formatMessageForWhatsApp(markdownMessage) {
  // Manejar primero los patrones combinados de negrita y cursiva (***texto***)

  if (!markdownMessage) return "";
  let formattedMessage = markdownMessage.replace(
    /\*\*\*(.*?)\*\*\*/g,
    "*_$1_*"
  );

  // Manejar negrita (**texto**) evitando conflictos con cursiva
  formattedMessage = formattedMessage.replace(/\*\*(.*?)\*\*/g, "__$1__");

  // Manejar cursiva (*texto*) pero omitiendo los casos de negrita que ya hemos convertido
  formattedMessage = formattedMessage.replace(
    /(^|[^_*])\*(.*?)\*(?!_)/g,
    "_$2_"
  );

  // Convertir negrita (__texto__) a negrita en WhatsApp (*texto*)
  formattedMessage = formattedMessage.replace(/__(.*?)__/g, "*$1*");

  // Reemplazar tachado (~~texto~~) por WhatsApp (~texto~)
  formattedMessage = formattedMessage.replace(/~~(.*?)~~/g, "~$1~");

  // Reemplazar monoespaciado (`texto`) por WhatsApp (```texto```)
  formattedMessage = formattedMessage.replace(/`(.*?)`/g, "```$1```");

  // Manejar listas (reemplazar guiones o asteriscos al inicio de la línea)
  formattedMessage = formattedMessage.replace(/^\s*-\s/gm, "• "); // Convertir "- " al inicio de la línea en "• "
  formattedMessage = formattedMessage.replace(/^\s*\*\s/gm, "• "); // Convertir "* " al inicio de la línea en "• "

  // Manejar saltos de línea dobles (Markdown usa dos espacios al final de la línea para indicar un salto)
  formattedMessage = formattedMessage.replace(/\n{2,}/g, "\n\n"); // Asegurar que haya un doble salto de línea

  // Eliminar encabezados, enlaces y otros elementos que WhatsApp no soporta
  formattedMessage = formattedMessage.replace(/#+\s/g, ""); // Elimina encabezados
  formattedMessage = formattedMessage.replace(/\[(.*?)\]\((.*?)\)/g, "$1 $2"); // Reemplaza enlaces por texto simple

  return formattedMessage;
}

function formatWppMarkdown(format) {
  format = whatsappStyles(format, "_", "<i>", "</i>");
  format = whatsappStyles(format, "*", "<b>", "</b>");
  format = whatsappStyles(format, "~", "<s>", "</s>");

  if (format !== undefined) {
    format = format.replace(/\n/gi, "<br>");
  }

  return whatsappLinkStyle(format);
}

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
};

function is_aplhanumeric(c) {
  let x = c.charCodeAt(0);
  return (x >= 65 && x <= 90) || (x >= 97 && x <= 122) || (x >= 48 && x <= 57);
}

function whatsappStyles(format, wildcard, opTag, clTag) {
  let indices = [];

  if (format !== undefined) {
    for (let i = 0; i < format.length; i++) {
      if (format[i] === wildcard) {
        if (indices.length % 2)
          format[i - 1] === " "
            ? null
            : typeof format[i + 1] == "undefined"
            ? indices.push(i)
            : is_aplhanumeric(format[i + 1])
            ? null
            : indices.push(i);
        else
          typeof format[i + 1] == "undefined"
            ? null
            : format[i + 1] === " "
            ? null
            : typeof format[i - 1] == "undefined"
            ? indices.push(i)
            : is_aplhanumeric(format[i - 1])
            ? null
            : indices.push(i);
      } else {
        format[i].charCodeAt() === 10 && indices.length % 2
          ? indices.pop()
          : null;
      }
    }
  }

  indices.length % 2 ? indices.pop() : null;

  let e = 0;
  indices.forEach(function (v, i) {
    let t = i % 2 ? clTag : opTag;
    v += e;
    format = format.substr(0, v) + t + format.substr(v + 1);
    e += t.length - 1;
  });
  return format;
}

function whatsappLinkStyle(text) {
  let pattern = new RegExp(
    "^(https?:\\/\\/)?" +
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" +
      "((\\d{1,3}\\.){3}\\d{1,3}))" +
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" +
      "(\\?[;&a-z\\d%_.~+=-]*)?" +
      "(\\#[-a-z\\d_]*)?$",
    "i"
  );

  if (pattern.test(text)) {
    return `<a href="${text}" target="_blank" rel="noreferrer">${text}</a>`;
  }

  return text;
}

const replaceAll = (str, find, replace) => {
  if (str === "") return;

  let test = str;

  try {
    test = str.replace(new RegExp(escapeRegExp(find), "g"), replace);
  } catch (error) {
    console.error(error);
  }

  return test;
};

const Assistant = new AssistantChat(process.env.ASSISTANT_ID, functions);

const flowGPT = addKeyword(EVENTS.WELCOME).addAction(async (ctx, ctxFn) => {
  console.log(ctx);
  const response = await Assistant.sendMessage(ctx.from, ctx.body);
  await ctxFn.flowDynamic(formatMessageForWhatsApp(response));
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
