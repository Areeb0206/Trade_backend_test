const { v4: uuid } = require("uuid");
const UploadCsvModel = require("../models/UploadCsv.model");
const uploadFilesToAws = require("./uploadFileToAws");

const uploadCsv = async ({ userId, accountId, brokerName, files }) => {
  let attachments = [];
  if (files?.csv?.length) {
    attachments = await Promise.all(
      files?.csv?.map((file) =>
        uploadFilesToAws(file, `trades/${userId}/interactiveBroker-csv-upload`)
      )
    );
  }

  const data = attachments?.map((file) => ({
    uuid: uuid(),
    userId,
    accountId,
    brokerName,
    fileName: file?.name || "IBKR CSV",
    url: file?.url,
  }));
  await UploadCsvModel.insertMany(data);
  return;
};

module.exports = uploadCsv;
