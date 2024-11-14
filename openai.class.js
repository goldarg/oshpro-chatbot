require("dotenv").config();
const { delay } = require("./utils/common");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");
const { URL, URLSearchParams } = require("url");

class AssistantChat {
  chatPool = {};
  assistant_id = "";
  openai = undefined;
  functions = {};
  blockedTokens = false;

  constructor(_assistant_id, allow_functions) {
    this.assistant_id = _assistant_id;
    this.functions = allow_functions;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  getThread = async (phone) => {
    if (this.chatPool[phone] === undefined) {
      const thread = await this.openai.beta.threads.create();
      console.log("CREANDO THREAD");
      this.chatPool[phone] = { thread, running: false };
    }

    return this.chatPool[phone];
  };

  sendMessage = async (phoneNumber, msg, filename = "") => {
    const isImage = filename == "" ? false : true;
    let hasPriority = false;
    const threadPhone = await this.getThread(phoneNumber);
    const { thread } = threadPhone;
    let { running } = threadPhone;
    if (running)
      return "Por favor, espere que estamos procesando su mensaje anterior.";
    try {
      threadPhone.running = true;
      running = true;

      let message = undefined;
      if (isImage) {
        const urlDownloads = new URL(
          process.env.SERVER_URL + "/downloads/" + filename
        );

        const urlStr = urlDownloads.toString();

        message = await this.openai.beta.threads.messages.create(thread.id, {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: urlStr, detail: "auto" } },
          ],
        });
      } else {
        message = await this.openai.beta.threads.messages.create(thread.id, {
          role: "user",
          content: msg,
        });
      }

      const maxRetries = 4;
      let retryCount = 0;

      await this.#waitForTokens();

      let run = await this.openai.beta.threads.runs.create(thread.id, {
        assistant_id: this.assistant_id,
      });

      while (running) {
        run = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);

        console.log(run.status);
        switch (run.status) {
          case "completed":
            threadPhone.running = false;
            running = false;
            break;
          case "requires_action":
            let tool_outputs = [];
            let functionsToCall = [];
            let tool_calls =
              run?.required_action?.submit_tool_outputs?.tool_calls;
            console.debug(tool_calls);
            tool_calls.forEach((tool_call) => {
              let function_name = tool_call.function.name;
              console.log("CALL FUNCTION:", function_name);
              let function_to_call = this.functions[function_name];
              let function_args = JSON.parse(tool_call.function.arguments);
              tool_outputs.push({
                tool_call_id: tool_call.id,
              });
              console.log("ARGUMENTS:", function_args);
              functionsToCall.push(function_to_call(function_args));
            });

            let response = await Promise.allSettled(functionsToCall);
            response.forEach(
              (obj, index) =>
                (tool_outputs[index].output = JSON.stringify(obj.value))
            );
            //console.log(JSON.stringify(tool_outputs));
            await delay(20000);
            await this.openai.beta.threads.runs.submitToolOutputs(
              thread.id,
              run.id,
              { tool_outputs: tool_outputs }
            );

            break;
          case ("cancelled", "expired"):
            console.log("CANCELLED OR EXPIRED");
            threadPhone.running = false;
            running = false;
            break;
          case "failed":
            if (retryCount < maxRetries) {
              try {
                const messagedList =
                  await this.openai.beta.threads.messages.list(thread.id);
              } catch (error) {
                console.log("Error en el listado de mensajes");
                console.log(error);
              }
              retryCount++;
              console.log(`Reintentando run... (${retryCount}/${maxRetries})`);
              const { code, message } = run.last_error;

              console.log({ code, message });

              let timeToWait = 10000;

              if (code == "rate_limit_exceeded") {
                let extractedDelay = this.#extractDelayInMilliseconds(message);

                if (extractedDelay) {
                  timeToWait = extractedDelay;
                }
              }

              console.debug(run);
              this.blockedTokens = true;
              hasPriority = true;
              await delay(
                retryCount < 3
                  ? timeToWait * 6
                  : timeToWait * 6 < 60
                  ? 60
                  : timeToWait * 6
              );
              run = await this.openai.beta.threads.runs.create(thread.id, {
                assistant_id: this.assistant_id,
              });

              break;
            } else {
              try {
                await this.openai.beta.threads.runs.submitToolOutputs(
                  thread.id,
                  run.id,
                  { tool_outputs: [] }
                );
              } catch (error) {
                console.log(error);
              }
              console.log("Número máximo de intentos alcanzado. Abortando.");
              threadPhone.running = false;
              running = false;
              console.debug(run);
              console.log("FAILEDDD");
              return "No pude procesar la respuesta. Inténtalo de nuevo.";
            }
        }
        await delay(1000);
      }
      console.log("obteniendo messages");
      const messageList = await this.openai.beta.threads.messages.list(
        thread.id
      );
      let mensajeToRespond = messageList.data[0].content[0].text.value;

      console.log(phoneNumber);
      console.log(mensajeToRespond);
      return mensajeToRespond;
    } catch (error) {
      console.log(error);
      console.log("borrando thread");
      await this.openai.beta.threads.del(thread.id);
      this.chatPool[phoneNumber] = undefined;
    } finally {
      if (hasPriority) {
        this.blockedTokens = false;
      }

      if (threadPhone) {
        threadPhone.running = false;
        running = false;
      }
    }
  };

  #waitForTokens() {
    return new Promise((resolve) => {
      const checkCondition = () => {
        if (!this.blockedTokens) {
          resolve(undefined);
        } else {
          setTimeout(checkCondition);
        }
      };

      checkCondition();
    });
  }

  #extractDelayInMilliseconds(message) {
    const regex = /try again in (\d+(\.\d+)?)(s|ms)/;
    const match = message.match(regex);

    if (match && match[1] && match[3]) {
      const timeValue = parseFloat(match[1]);
      const unit = match[3];

      let timeInMilliseconds;

      if (unit === "s") {
        timeInMilliseconds = timeValue * 1000; // Convertir segundos a milisegundos
      } else if (unit === "ms") {
        timeInMilliseconds = timeValue; // Ya está en milisegundos
      }

      return timeInMilliseconds;
    } else {
      console.error("No se pudo extraer el tiempo de espera del mensaje.");
      return null; // Retorna null si no se encuentra el tiempo
    }
  }
}

module.exports = AssistantChat;
