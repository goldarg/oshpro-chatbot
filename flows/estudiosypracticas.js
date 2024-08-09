const { addKeyword, EVENTS } = require("@bot-whatsapp-custom/bot");
const { getIntegrantes, createSolicitud } = require("../services/Vtiger");
const {
  fileSizeIsValid,
  fileTypeIsValid,
  extractMediaIdFromUrl,
  dateIsValid,
} = require("../utils/common");
const { getMediaInfo } = require("../services/Meta");

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
    const { afiliado } = state.getMyState(ctx.from);
    const integrantes = await getIntegrantes(afiliado.nro);
    const lista = integrantes.map((el, index) => {
      return emoticones[index + 1] + ". " + el;
    });
    await flowDynamic([
      { body: "Elija el integrante del grupo familiar:\n" + lista.join("\n") },
    ]);
    state.update({ integrantes: integrantes });
  })
  .addAction({ capture: true }, (ctx, { state, fallBack }) => {
    const { integrantes } = state.getMyState(ctx.from);
    const index = parseInt(ctx.body) - 1;
    const integrante = integrantes[index];
    if (integrante === null || integrante === undefined)
      return fallBack(
        "Opcion incorrecta. Seleccione un integrante de la lista."
      );
    state.update({ integrante: integrante });
  })
  .addAnswer(
    "Indique la fecha de la orden médica (DD/MM/AAAA)",
    {
      capture: true,
    },
    (ctx, ctxFn) => {
      if (!dateIsValid(ctx.body))
        ctxFn.fallBack("Fecha invalida. Intente nuevamnete DD/MM/AAAA");
    }
  )
  .addAnswer(
    "Adjuntar Orden Médica (pdf,jpg,png max: 5mb)",
    {
      capture: true,
    },
    async (ctx, ctxfn) => {
      console.log(ctx);
      /*const adjuntosPosible = ["document", "image"];
      if (!adjuntosPosible.includes(ctx.type))
        return ctxfn.fallBack("Debe ser una imagen o un pdf");
      const isSizeValid = fileSizeIsValid(mediaData.file_size);
      if (!isSizeValid)
        return ctxfn.fallBack(
          "El archivo supera los 5mb. Intente con otro archivo"
        );
      const isFileTypeValid = fileTypeIsValid(mediaData.mime_type);
      if (!isFileTypeValid)
        return ctxfn.fallBack(
          "Solo se admiten imagenes jpg,png o pdf. Intente nuevamente"
        );
      ctxfn.state.update({ imageUrl: ctx.url });*/
    }
  )
  .addAnswer(
    "Su solicitud va a ser generada. En breve le compartiremos el numero de solicitud",
    null,
    async (_, { state, flowDynamic }) => {
      const currentState = state.getMyState();
      const solicitud = await createSolicitud(currentState);
      console.log("solicitud: ", solicitud);
      return await flowDynamic([
        {
          body: `Tu solicitud fue creada con el numero *${solicitud}*\n`,
        },
        {
          body: `Que tengas un buen dia`,
        },
      ]);
    }
  );
