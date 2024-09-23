const { addKeyword, EVENTS } = require("@bot-whatsapp-custom/bot");
const ChatGPTClass = require("../chatgpt.class");
const { delay } = require("../utils/common");

let prompt = `Actúa como una agente que trabaja en para SCIS medicina prepaga tu nombre es Matias es importante que te presentes y menciones tu nombre. {saludo}.
El problema del usuario es: {problema}. Debes decirle amablemente que lo ayudaras con su consulta.
**Datos de Contacto de la empresa** : URGENCIAS Y EMERGENCIAS 0810-345-SCIS (7247) || Atención al Socio (11) 5246-1600 || info@scis.com.ar`;

const ChatGPT = new ChatGPTClass(prompt);
module.exports = addKeyword(EVENTS.ACTION).addAction(async (ctx, ctxFn) => {
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
  ctxFn.endFlow(response.text);
});
