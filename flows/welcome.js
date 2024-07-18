const { addKeyword, EVENTS } = require("@bot-whatsapp/bot");
const flowLogin = require("./login");
const flowEstudiosyPracticas = require("./estudiosypracticas");
const flowMedicacionEspecial = require("./medicacionespecial");
const flowInternacion = require("./internacion");
const flowTraslados = require("./traslado");
const flowPlanMaterno = require("./planmaterno");
const flowOtros = require("./otros");

const menuOptions = {
  1: flowEstudiosyPracticas,
  2: flowMedicacionEspecial,
  3: flowInternacion,
  4: flowTraslados,
  5: flowPlanMaterno,
  6: flowOtros,
};

const prompt = "";

module.exports = addKeyword(EVENTS.ACTION).addAnswer(
  [
    "Bienvenido a SCIS - Medicina Privada\n\n",
    "En que lo podemos ayudar?\n",
    "Escriba alguna de las siguientes opciones:\n\n",
    "1️⃣.Estudios y Prácticas en Ambulatorio",
    "2️⃣.Medicación Especial",
    "3️⃣.Internaciones y Cirugías Programadas",
    "4️⃣.Traslados Médicos",
    "5️⃣.Plan Materno Infantil",
    "6️⃣.Otras",
  ],
  { capture: true },
  async (ctx, { gotoFlow, fallBack, state }) => {
    const currentState = state.getMyState();

    const option = ctx.body;
    const flow = menuOptions[option];
    if (flow === null || flow === undefined)
      return fallBack("Opcion incorrecta. Intente nuevamente");

    if (!currentState || !currentState?.logged) {
      state.update({ nextFlow: flow });
      return await gotoFlow(flowLogin);
    }
    await gotoFlow(flow);
  }
);
