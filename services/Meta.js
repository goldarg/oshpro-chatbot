const path = require("path");
const fs = require("fs");
const { mkdir } = require("fs/promises");
const fetch = require("node-fetch");
const { writeFile } = require("fs").promises;
const mime = require("mime-types");
require("dotenv").config();
const token = process.env.META_TOKEN;
const version = process.env.META_VERSION;
const getMediaInfo = async (mediaId) => {
  const options = {
    method: "GET",
    headers: {
      "User-Agent": "insomnia/2023.5.8",
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await fetch(
    `https://graph.facebook.com/${version}/${mediaId}`,
    options
  );
  if (!response.ok) {
    const message = `An error has occured: ${response.status}`;
    throw new Error(message);
  }
  const data = await response.json();
  return data;
};

const downloadMedia = async (url, filename) => {
  console.log("URL", url);

  const response = await fetch(url, {
    headers: {
      Authorization: "Bearer " + process.env.META_TOKEN,
    },
  });
  const fileExtension = mime.extension(response.headers.get("content-type"));
  const buffer = await response.buffer();
  await writeFile(
    path.join("downloads/", filename + "." + fileExtension),
    buffer
  );
};

module.exports = {
  getMediaInfo,
  downloadMedia,
};
