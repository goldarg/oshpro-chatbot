const forge = require("node-forge");
const { sha3_512 } = require("js-sha3");
const crypto = require("crypto");

const encryptSHA3 = async (data) => {
  // Encriptar los datos usando SHA3-512
  const hashHex = sha3_512(data);

  return hashHex;
};

const encryptRSA = async (publicKeyPem, data) => {
  // Convertir la clave pública PEM a un objeto de clave pública
  const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);

  // Encriptar los datos usando OAEP con SHA-1 y MGF1
  const encryptedData = publicKey.encrypt(data, "RSA-OAEP", {
    md: forge.md.sha1.create(),
    mgf1: {
      md: forge.md.sha1.create(),
    },
  });

  // Convertir los datos encriptados a una cadena en base64
  const encryptedBase64 = forge.util.encode64(encryptedData);

  return encryptedBase64;
};

const decryptRSA = async (publicKeyPem, encryptedBase64) => {
  const encryptedData = Buffer.from(encryptedBase64, "base64");

  const decryptedData = crypto.publicDecrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    encryptedData
  );

  return decryptedData;
};

module.exports = { encryptRSA, decryptRSA, encryptSHA3 };
