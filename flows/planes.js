const { addKeyword, EVENTS } = require("@bot-whatsapp/bot");
const ChatGPTClass = require("../chatgpt.class");
const { delay } = require("../utils/common");

let prompt = `Actúa como una agente que trabaja en para SCIS medicina prepaga tu nombre es Matias es importante que te presentes y menciones tu nombre. {saludo}. 
El problema del usuario es: {problema}. Debes decirle amablemente que lo ayudaras y para ello necesitas algunos datos para generar la autorización. Ve paso a paso garantizando que el usuario te toda la informacion.
Planes disponibles:
SC100: plan basico que cubre todo segun el Plan Medico Obligatorio
SC1100: plan basico que cubre todo segun el Plan Medico Obligatorio y añade atencion exclusiva en nuestros centros
SC150: Todo lo que incluyen un plan basico pero sin pagar copagos
SC250: Plan premium para toda la familia sin limites.

`;
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
