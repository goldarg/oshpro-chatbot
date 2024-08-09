require("dotenv").config();
const { delay } = require("./utils/common");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");
const { URL, URLSearchParams } = require('url');

class AssistantChat {
  chatPool = {};
  assistant_id = "";
  openai = undefined;
  running = false;
  functions = {};

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
      this.chatPool[phone] = thread;
      return thread;
    } else {
      return this.chatPool[phone];
    }
  };

  convertImageToBase64 = async (filePath) => {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, { encoding: "base64" }, (err, data) => {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });
  };

  sendMessage = async (phoneNumber, msg, filename = "") => {
    const isImage = filename == "" ? false : true;
    if (this.running) return;
    this.running = true;
    let thread = undefined;
    try {
      thread = await this.getThread(phoneNumber);
      //console.log(thread);

      let message = undefined;
      if (isImage) {
        const urlDownloads = new URL(process.env.SERVER_URL + "/downloads/" + filename);

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
          content: isImage
            ? `Informacion solicitada ${msg} \n {imagen: "${filename}"}`
            : msg,
        });
      }

      let run = await this.openai.beta.threads.runs.create(thread.id, {
        assistant_id: this.assistant_id,
      });

      while (this.running) {
        run = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);

        console.log(run.status);
        switch (run.status) {
          case "completed":
            this.running = false;
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
            await this.openai.beta.threads.runs.submitToolOutputs(
              thread.id,
              run.id,
              { tool_outputs: tool_outputs }
            );

            break;
          case ("cancelled", "expired"):
            this.running = false;
            break;
          case "failed":
            this.running = false;
            console.debug(run);
        }
        await delay(500);
      }
      console.log("obteniendo messages");
      const messageList = await this.openai.beta.threads.messages.list(
        thread.id
      );
      //console.log(messageList);
      return messageList.data[0].content[0].text.value;
    } catch (error) {
      console.log(error);
      console.log("borrando thread");
      await this.openai.beta.threads.del(thread.id);
    }
  };
}

module.exports = AssistantChat;
