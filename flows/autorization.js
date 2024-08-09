const afiliados = {
  123456: {
    name: "Matias Garcia Rebaque",
    dni: "34330005",
  },
};
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const { addKeyword } = require("@bot-whatsapp-custom/bot");
module.exports = (initFlow) =>
  addKeyword("autorizaciones")
    .addAction((ctx, { state }) => {
      console.log("Inicio Autorizacion");
      console.log(ctx);
      console.log(state.getAllState());
      console.log(state.getMyState());
    })
    .addAnswer(
      "Para ayudarlo a continuacion le solicitaremos algunos datos para poder pedir la *Autorizacion*\n"
    )
    .addAction((ctx, { state }) => {
      console.log("Inicio Afiliado");
      console.log(ctx);
      console.log(state.getAllState());
      console.log(state.getMyState());
    })
    .addAnswer(
      "Introduzca su numero de afiliado:",
      { capture: true, delay: 500 },
      async (ctx, { fallBack, gotoFlow, state }) => {
        const pattern = /\d{6}/gm;
        const credential = ctx.body.match(pattern);
        console.log(ctx);
        if (credential == null)
          return fallBack(
            "❌ No detectamos el nro de afiliado de 6 números\n\n Introduzca su numero de afiliado:"
          );

        const afiliado = afiliados[credential[0]];
        if (!afiliado)
          return fallBack(
            "❌ El nro de afiliado no existe\n\n Introduzca su numero de afiliado:"
          );

        state.update({ ...afiliado, afiliado: credential[0] });
      }
    )
    .addAnswer(
      "Ingrese su DNI",
      { capture: true },
      async (ctx, { fallBack, flowDynamic, gotoFlow, state }) => {
        const pattern = /\d+/gm;
        const dni = ctx.body.match(pattern);
        if (dni == null) return fallBack();
        const currentState = state.getMyState();

        if (parseInt(currentState.dni) != parseInt(dni[0])) {
          await flowDynamic([
            {
              body: `El numero de DNI no coincide con el afiliado\n`,
            },
          ]);
          await delay(1000);
          return await gotoFlow(initFlow);
        }
        return flowDynamic([
          {
            body: `Bienvenido ${currentState.name}!. Solo quedan unos pocos pasos mas 😊.`,
          },
        ]);
      }
    );
