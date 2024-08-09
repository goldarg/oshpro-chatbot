const { addKeyword, EVENTS } = require("@bot-whatsapp-custom/bot");
const ChatGPTClass = require("../chatgpt.class");
const { delay } = require("../utils/common");

let prompt = `Actúa como una agente que trabaja en para SCIS medicina prepaga tu nombre es Matias es importante que te presentes y menciones tu nombre. {saludo}.
El problema del usuario es: {problema}. Debes decirle amablemente que lo ayudaras y para ello necesitas algunos datos para consultar la cartilla. Ve paso a paso garantizando que el usuario te toda la informacion.
Necesitas solicitar:
La provincia, la ciudad, la Seccion (profesionales, hospitales, clinicas, farmacias, Servicio de guardia 24hs). En caso que te haya especificado profesionales debes solicitar la especialidad.
Es importante que solicites todos los datos y una vez obtenidos debes devolver un JSON con toda la informacion.

`;
const ChatGPT = new ChatGPTClass(prompt);
module.exports = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, ctxFn) => {
    const currentState = ctxFn.state.getMyState();
    let instrucciones = "";
    console.log(currentState);
    if (!currentState.saludo) {
      instrucciones = instrucciones.concat(
        instrucciones,
        "\n",
        "[INTRUCCIONES] {saludo} = NO te presentes y NO tienes que saludes. Solo guialo con su problema.)"
      );
    } else {
      instrucciones = instrucciones.concat(
        instrucciones,
        "\n",
        "[INTRUCCIONES] {saludo} = Debes que saludar y presentarte amablemente.)"
      );
    }
    instrucciones = instrucciones.concat(
      instrucciones,
      "\n",
      `[INTRUCCIONES] {problema} = '${currentState.problema}'`
    );
    console.log("INSTRUCCIONES", instrucciones);
    let response = await ChatGPT.SendMessage(instrucciones);
    console.log(JSON.stringify(response));
    ctxFn.state.update({ saludo: true });
    ctxFn.flowDynamic(response.text);
  })
  .addAction({ capture: true }, async (ctx, ctxFn) => {
    let response = await ChatGPT.SendMessage(ctx.body);
    console.log(JSON.stringify(response));
    let mensaje = "";
    if (response.text.indexOf("{") >= 0) {
      return ctxFn.flowDynamic(response.text);
    }
    return ctxFn.fallBack(response.text);
  });
