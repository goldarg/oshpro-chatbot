const { addKeyword, EVENTS } = require("@bot-whatsapp-custom/bot");
const { Integrantes } = require("../services/Vtiger");
const { delay } = require("../utils/common");
const emoticones = {
  1: "1️⃣",
  2: "2️⃣",
  3: "3️⃣",
  4: "4️⃣",
  5: "5️⃣",
  6: "6️⃣",
};

module.exports = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, { flowDynamic, state }) => {
    const currentState = state.getMyState(ctx.from);
    const integrantes = await Integrantes(currentState.afiliado);
    const lista = integrantes.map((el, index) => {
      return emoticones[index + 1] + ". " + el;
    });
    await delay(1500);
    await flowDynamic([
      {
        body:
          "Seleccione el integrante del grupo familiar:\n" + lista.join("\n"),
      },
    ]);
  })
  .addAction({ capture: true })

  .addAnswer("Indique la fecha de la orden médica (DD/MM/AAAA)", {
    capture: true,
  })
  .addAnswer(
    "Adjuntar Orden Médica (pdf,jpg,png max: 5mb)",
    {
      capture: true,
    },
    (ctx, ctxfn) => {
      console.log(ctx);
      const adjuntosPosible = ["document", "image"];
      if (!adjuntosPosible.includes(ctx.type)) return ctxfn.fallBack();
    }
  )
  .addAnswer(
    "Indique el Domicilio de Entrega completo (Barrio, calle, número, piso, depto.,código postal, entre calles, provincia).",
    { capture: true }
  )
  .addAnswer("Su solicitud va a ser generada");
