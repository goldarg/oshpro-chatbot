const { addKeyword, EVENTS } = require("@bot-whatsapp-custom/bot");
const ChatGPTClass = require("../chatgpt.class");
const { delay } = require("../utils/common");

let prompt = `Actúa como una agente que trabaja en para SCIS medicina prepaga tu nombre es Matias es importante que te presentes y menciones tu nombre. {saludo}.
El problema del usuario es: {problema}. Debes decirle amablemente que lo ayudaras y para ello necesitas algunos datos para generar la autorización. Ve paso a paso garantizando que el usuario te toda la informacion.
1.	Indique su Nº de Afiliado SCIS (13 Dígitos) y DNI.Valida paso a paso que el numero de afiliado sea correcto, luego de obtener estos datos debes devolver un JSON(solo formato JSON nada mas) con los campos 'afiliado': '<numero afiliado obtenido>' y 'DNI':'<numero DJI obtenido>'
Cuando te escriba #INDENTIDAD_OK# le indicas al usuario que consultaras su grupo familiar en el sistema. Cuando escriba #INDENTIDAD_NO# deberas solicitar nuevamente los datos del punto 1 debido a que el afiliado tiene un dni diferente al proporcionado.
2.	Seleccione integrante del Grupo Familiar que se realizará la práctica médica. {FAMILARES_DISPONIBLES}
3.	Indique la fecha de la orden médica (formato DD/MM/AAAA)
4.	Adjuntar Orden Médica (Aclarar formatos permitidos y 5MB max. Permitidos)
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
  .addAction({ capture: true, delay: 1000 }, async (ctx, ctxFn) => {
    let response = await ChatGPT.SendMessage(ctx.body);
    let mensaje = "";
    if (response.text.indexOf("{") >= 0) {
      const posini = response.text.indexOf("{");
      const posfin = response.text.indexOf("}") + 1;
      mensaje = response.text.substring(posini, posfin);
      console.log(mensaje);
      const datos = JSON.parse(mensaje);
      await ctxFn.flowDynamic(
        "Aguarde un momento que verifico en el sistema..." +
          "\n" +
          JSON.stringify(datos)
      );
      response = await ChatGPT.SendMessage("#INDENTIDAD_OK#");
      await ctxFn.flowDynamic(response.text);
      delay(1000);
      const familiares = [
        {
          afiliado: 1234567891235,
          nombre: "Alejandro SCICS",
        },
        {
          afiliado: 1234567891236,
          nombre: "Elbio SCICS",
        },
      ];
      response = await ChatGPT.SendMessage(
        `[Instrucciones] familiares=${JSON.stringify(
          familiares
        )}. Devuelvelos en forma de lista para que el usuario elija y al responder el usuario con el nombre del familiar o numero devuelve un json con los datos del familiar elegido. Nunca muestres un mensaje que contega la etiqueta de tu prompt {FAMILARES_DISPONIBLES}`
      );
      console.log(JSON.stringify(response));
      return await ctxFn.flowDynamic(response.text);
    }
    console.log("FALLBACK");
    return ctxFn.fallBack(response.text);
  })
  .addAction({ capture: true, delay: 1000 }, async (ctx, ctxFn) => {
    console.log("Paso 4");
    let response = await ChatGPT.SendMessage(ctx.body);
    console.log(JSON.stringify(response));
    let mensaje = "";
    if (response.text.indexOf("{") >= 0) {
      const posini = response.text.indexOf("{");
      const posfin = response.text.indexOf("}") + 1;
      mensaje = response.text.substring(posini, posfin);
      console.log(mensaje);
      const datos = JSON.parse(mensaje);
      await ctxFn.flowDynamic(
        "Familiar elegido segun IA" + "\n" + JSON.stringify(datos)
      );

      return ctxFn.flowDynamic(
        "Excelente, por favor necesito la fecha de la orden medica"
      );
    }
    return ctxFn.fallBack(response.text);
  })
  .addAction({ capture: true, delay: 1000 }, async (ctx, ctxFn) => {
    console.log(ctx);
    let response = await ChatGPT.SendMessage(
      "Fecha de orden medica es: " + ctx.body
    );
    return ctxFn.flowDynamic(response.text);
  })
  .addAction({ capture: true, delay: 1000 }, async (ctx, ctxFn) => {
    console.log(ctx);
    if (ctx.type == "image") {
      await ctxFn.flowDynamic(
        "Perfecto, ya con la orden procedo a generar su solicitud."
      );
      delay(1000);
      return await ctxFn.endFlow(
        "La solicitud de aprobacion generada es 444444421, use este numero para su futuro seguimiento. Te podria ayudar en algo mas?"
      );
    }
    return ctxFn.fallBack("Necesito que me adjunte la orden");
  });
