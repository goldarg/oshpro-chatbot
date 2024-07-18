require("dotenv").config();
class ChatGPTClass {
  queue = [];
  optionsGPT = { model: "gpt-4-turbo-preview" };
  openai = undefined;
  systemMessage = null;

  constructor(systemMessage) {
    this.systemMessage = systemMessage;
    this.init().then();
  }

  /**
   * Esta funciona inicializa
   */
  init = async () => {
    const { ChatGPTAPI } = await import("chatgpt");
    // const tools = [
    //   {
    //     type: "function",
    //     function: {
    //       name: "consulta_cartilla",
    //       description: "Permite consultar la cartilla medica",
    //       parameters: {
    //         type: "object",
    //         properties: {
    //           plan: {
    //             type: "string",
    //             enum: ["SC100", "SC1100", "SC150", "SC250"],
    //             description: "planes medicos",
    //           },
    //           tipo_busqueda: {
    //             type: "string",
    //             value: "ubicacion",
    //             description:
    //               "Solo permite el valor por ubicacion. siempre lo devuelve",
    //           },
    //           parametro_busqueda: {
    //             type: "string",
    //             value: "cartilla",
    //             description: "Su valor siempre es Cartilla",
    //           },
    //           seccion: {
    //             type: "string",
    //             enum: [
    //               "Centros de Servicios de Guardia",
    //               "hospitales",
    //               "odontologia",
    //             ],
    //             description: "The stock symbol",
    //           },
    //           especialidad: {
    //             type: "string",
    //             description: "especialidad buscada",
    //           },
    //         },
    //         required: [
    //           "plan",
    //           "tipo_busqueda",
    //           "parametro_busqueda",
    //           "seccion",
    //           "especialidad",
    //         ],
    //       },
    //     },
    //   },
    //   {
    //     type: "function",
    //     function: {
    //       name: "consulta_familiares",
    //       description:
    //         "Consulta los familiares de un afiliado y devuelve una lista de personas que pertenecen al grupo familiar.",
    //       parameters: {
    //         type: "object",
    //         properties: {
    //           afiliado: {
    //             type: "number",
    //             description: "numero de afilado",
    //           },
    //         },
    //         required: ["afiliado"],
    //       },
    //     },
    //   },
    //   {
    //     type: "function",
    //     function: {
    //       name: "autorizacion_materno_infantil",
    //       description:
    //         "Este plan está destinado a contribuir al crecimiento y desarrollo adecuado e integral de los niños comprendidos entre 0 y 5 años de edad. Comprende atención pediátrica y la entrega de 2 kg de leche mensuales por niño. También contempla a niños con desnutrición crónica (retardo de crecimiento), embarazadas, madres en periodo de lactancia (los primeros 6 meses) y pacientes con patologías especiales.",
    //       parameters: {
    //         type: "object",
    //         properties: {
    //           afiliado: {
    //             type: "number",
    //             description: "numero de afilado",
    //           },
    //           dni: {
    //             type: "number",
    //             description: "numero de afilado",
    //           },
    //         },
    //         required: ["afiliado", "dni"],
    //       },
    //     },
    //   },
    // ];

    this.openai = new ChatGPTAPI({
      apiKey: process.env.OPENAI_API_KEY,
      debug: false,
      completionParams: {
        model: "gpt-4-turbo-preview",
        temperature: 0.1,
        // response_format: { type: "json_object" },
        // tools: tools,
        // tool_choice: "auto",
      },
    });
  };

  /**
   * Manejador de los mensajes
   * sun funcion es enviar un mensaje a wahtsapp
   * @param {*} ctx
   */
  SendMessage = async (body) => {
    const interaccionChatGPT = await this.openai.sendMessage(body, {
      systemMessage: this.systemMessage,
      conversationId: !this.queue.length
        ? undefined
        : this.queue[this.queue.length - 1].conversationId,
      parentMessageId: !this.queue.length
        ? undefined
        : this.queue[this.queue.length - 1].id,
    });

    this.queue.push(interaccionChatGPT);
    console.log("QUEUE", this.queue);
    return interaccionChatGPT;
  };
}

module.exports = ChatGPTClass;
