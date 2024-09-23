const { addKeyword, EVENTS } = require("@bot-whatsapp-custom/bot");
const { getAfiliadoInfo } = require("../services/Vtiger");
const { afiliadoIsValid } = require("../utils/common");
module.exports = addKeyword(EVENTS.ACTION)
  .addAnswer(
    [
      "Antes de continuar con la opción elegida validaremos su identidad.\n",
      "Ingrese su numero de afiliado:",
    ],
    { capture: true, callback: false },
    async (ctx, { state, fallBack }) => {
      if (!afiliadoIsValid(ctx.body))
        return fallBack(
          "El numero debe ser de 13 digitos. Por favor intente nuevamente."
        );
      const afiliado = await getAfiliadoInfo(ctx.body);
      if (afiliado === null || afiliado === undefined) {
        return fallBack(
          "El numero afiliado no existe. Por favor intente nuevamente."
        );
      }
      state.update({ afiliado: afiliado });
    }
  )
  .addAnswer(
    "Ingrese su DNI:",
    { capture: true },
    async (ctx, { state, gotoFlow, fallBack }) => {
      const { afiliado, nextFlow } = state.getMyState(ctx.from);
      const flow = nextFlow;
      const valid = afiliado.dni == ctx.body;
      if (!valid)
        return fallBack(
          "El DNI no coincide con el afiliado. Intente nuevamente"
        );

      state.update({ logged: true, nextFlow: null });

      await gotoFlow(flow);
    }
  );
