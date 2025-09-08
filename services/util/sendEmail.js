const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const axios = require("axios");

const {
  accessKeyId,
  secretAccessKey,
  sesAccessKey,
  sesSecretAccessKey,
  region,
  sesRegion,
  sesSenderAddress,
} = require("../../config/keys").aws;
const zeptoSecret = require("../../config/keys").zeptoSecret;

const SES_CONFIG = {
  accessKeyId: accessKeyId,
  secretAccessKey: secretAccessKey,
  region: sesRegion,
};
const ses = new AWS.SES(SES_CONFIG);
let transporter = nodemailer.createTransport({
  SES: ses,
});

const sendMultipleAttachmentEmail = async (
  recipients,
  subject,
  template,
  attachments
) => {
  let info = await transporter.sendMail({
    from: sesSenderAddress,
    to: recipients,
    subject: subject,
    html: template,
    attachments,
  });
  return info;
};

const sendAttachmentEmail = async (
  recipients,
  subject,
  template,
  attachmentPath
) => {
  let filePath, pdfContent;
  // Read file content as binary
  filePath = path.join(__dirname, "attachment_files", attachmentPath);
  pdfContent = fs.readFileSync(filePath);
  // Convert binary content to base64
  const base64Content = pdfContent.toString("base64");

  let info = await transporter.sendMail({
    from: sesSenderAddress,
    to: recipients,
    subject: subject,
    html: template,
    attachments: [
      {
        filename: attachmentPath,
        content: base64Content,
        encoding: "base64",
        contentType: "application/pdf",
      },
    ],
  });
  console.log("Message sent: %s", info.messageId);
  return info;
};

/**
 * Sends email address
 * @param {Array} recipients - Array of recipient email addresses
 * @param {String} subject - Subject line of the email
 * @param {String} template - Email body in html with inline styles
 */
// const sesSendEmail = (recipients, subject, template) => {
//   return new Promise((resolve, reject) => {
//     try {
//       // console.log("template, ", template);
//       // const data = {
//       //   from: {
//       //     address: "noreply@tradelizer.com",
//       //     name: "TradeLizer - No Reply",
//       //   },
//       //   to: recipients.map((i) => ({ email_address: { address: i } })),
//       //   subject,
//       //   htmlbody: template,
//       // };
//       // return axios.post("https://api.zeptomail.in/v1.1/email", data, {
//       //   headers: {
//       //     Accept: "application/json",
//       //     "Content-Type": "application/json",
//       //     Authorization: zeptoSecret,
//       //   },
//       // });
//       // .then(() => resolve())
//       // .catch(() => reject());
//       const params = {
//         Destination: {
//           ToAddresses: recipients,
//           // BccAddresses: ["masafvi48@gmail.com"],
//         },
//         Message: {
//           Body: {
//             Html: {
//               // HTML Format of the email
//               Charset: "UTF-8",
//               Data: template,
//             },
//           },
//           Subject: {
//             Charset: "UTF-8",
//             Data: subject,
//           },
//         },
//         Source: "admin@tradelizer.com",
//       };
//       const sendEmail = async () => await ses.sendEmail(params).promise();
//       sendEmail().then(() => resolve());
//     } catch (error) {
//       return reject(error);
//     }
//   });
// };
const sendEmail = (
  recipients,
  subject,
  template,
  address = "noreply@tradelizer.com",
  ccRecipients = []
) => {
  return new Promise((resolve, reject) => {
    try {
      const params = {
        Source: address, // Must be verified in SES
        Destination: {
          ToAddresses: recipients, // Array of emails
          CcAddresses: ccRecipients, // Array of emails
        },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: template, Charset: "UTF-8" },
          },
        },
      };
      const sendEmail = async () => await ses.sendEmail(params).promise();
      sendEmail();
      resolve();
    } catch (error) {
      return reject(error);
    }
  });
};
// const sendEmail = (
//   recipients,
//   subject,
//   template,
//   address = "noreply@tradelizer.com",
//   ccRecipients = []
// ) => {
//   return new Promise((resolve, reject) => {
//     try {
//       const data = {
//         from: {
//           // address: "admin@tradelizer.com",
//           address,
//           name: "TradeLizer - No Reply",
//           // bcc: "support@tradelizer.com",
//         },
//         to: recipients?.map((i) => ({ email_address: { address: i } })),
//         cc: ccRecipients?.map((i) => ({ email_address: { address: i } })),
//         // cc: [
//         //   {
//         //     email_address: {
//         //       address: "support@tradelizer.com",
//         //       name: "Support",
//         //     },
//         //   },
//         // ],
//         subject,
//         htmlbody: template,
//       };
//       //surya
//       // https://api.zeptomail.in/v1.1/email
//       // joban
//       // https://api.zeptomail.ca/v1.1/email
//       // areeb
//       // https://api.zeptomail.in/v1.1/email
//       return axios
//         .post("https://api.zeptomail.ca/v1.1/email", data, {
//           headers: {
//             Accept: "application/json",
//             "Content-Type": "application/json",
//             Authorization: zeptoSecret,
//           },
//         })
//         .then(() => resolve())
//         .catch((error) => {
//           console.error("Error sending email:", error);
//           reject(error);
//         });
//     } catch (error) {
//       console.error("Error sending email:", error);
//       return reject(error);
//     }
//   });
// };

const generateOTP = () => {
  var digits = "0123456789";
  var otpLength = 4;
  var otp = "";
  for (let i = 1; i <= otpLength; i++) {
    var index = Math.floor(Math.random() * digits.length);
    otp = otp + digits[index];
  }
  return otp;
};

module.exports = {
  generateOTP,
  sendEmail,
  sendAttachmentEmail,
  sendMultipleAttachmentEmail,
};
