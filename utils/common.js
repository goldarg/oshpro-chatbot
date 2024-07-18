const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const dateIsValid = (dateStr) => {
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;

  if (dateStr.match(regex) === null) {
    return false;
  }

  const [day, month, year] = dateStr.split("/");

  // 👇️ format Date string as `yyyy-mm-dd`
  const isoFormattedStr = `${year}-${month}-${day}`;

  const date = new Date(isoFormattedStr);

  const timestamp = date.getTime();

  if (typeof timestamp !== "number" || Number.isNaN(timestamp)) {
    return false;
  }

  return date.toISOString().startsWith(isoFormattedStr);
};

const afiliadoIsValid = (n) => n.length === 13;

const fileSizeIsValid = (size) => size <= 5 * 1024 * 1024;
const fileTypeIsValid = (mimeType) => {
  const validMimeTypes = ["image/jpeg", "image/png", "application/pdf"];
  return validMimeTypes.includes(mimeType);
};
const extractMediaIdFromUrl = (url) => {
  const regex = /(?<=mid=)[\w]+(?=&)/;
  const match = url.match(regex);
  if (match === null) return null;
  return match[0];
};
module.exports = {
  delay,
  dateIsValid,
  afiliadoIsValid,
  fileSizeIsValid,
  fileTypeIsValid,
  extractMediaIdFromUrl,
};
