const DailyJournal = require("../../models/DailyJournal.model");
const { v4: uuid } = require("uuid");
const formidable = require("formidable");
const { upload } = require("../../services/util/upload-files");
const uploadFilesToAws = async (files, folderName) => {
  const location = files?.path || files?.filepath;
  const originalFileName = files?.name || files?.originalFilename;
  const fileType = files?.type || files?.mimetype;
  const data = await upload(location, originalFileName, folderName, fileType);
  return {
    url: data?.Location,
    type: fileType,
    name: originalFileName,
    uuid: uuid(),
  };
};
const addNotes = async (req, res, next) => {
  try {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          res.status(400);
          res.send(err);
        }
        let { journalId, notes, date, removedAttachments, type } = fields;
        //if user is updating the journal entry, journalId will be present
        journalId = journalId?.[0];
        notes = notes?.[0];
        date = date?.[0];
        type = type?.[0] || "diary";
        if (!date) {
          throw new Error("Date is required");
        }
        //here we are checking if the notes are empty or not

        const exp = /<p[^>]*>( |\s+|<br\s*\/?>)*<\/p>/g; // Updated regex
        //check if the notes or attachments are present then only we have to show the icon
        const isNote = !!notes?.replace(exp, "").trim();
        //here its the first time user is adding the journal entry
        // then we have to check if the notes are empty or not
        if (!isNote && !journalId) {
          throw new Error("Please add some notes");
        }
        if (removedAttachments)
          removedAttachments = JSON.parse(removedAttachments);
        const { uuid: user } = req.user;
        // find the journal entry for the date
        let journal = await DailyJournal.findOne({
          $or: [{ date, user, type }, { uuid: journalId }],
        });

        let attachments = [];
        if (files?.image?.length) {
          attachments = await Promise.all(
            files?.image?.map((file) =>
              uploadFilesToAws(file, `trading-diary/${user}`)
            )
          );
        }

        // if journal entry exists, update the notes
        if (!journal) {
          journal = await DailyJournal.create({
            uuid: uuid(),
            date,
            notes,
            type,
            user,
            ...(attachments?.length && { attachments }),
          });
        } else {
          let updatedAttachments = journal?.attachments || [];
          if (removedAttachments?.length) {
            updatedAttachments = updatedAttachments.filter(
              (att) => !removedAttachments.includes(att.uuid)
            );
          }
          if (attachments?.length) {
            updatedAttachments.push(...attachments);
          }
          journal = await DailyJournal.findOneAndUpdate(
            { uuid: journalId },
            {
              $set: {
                notes,
                type,
                ...(updatedAttachments?.length && {
                  attachments: updatedAttachments,
                }),
              },
              // $addToSet: {
              //   ...(updatedAttachments?.length && {
              //     attachments: updatedAttachments,
              //   }),
              // },
              // $pull: {
              //   ...(removedAttachments?.length && {
              //     attachments: { uuid: { $in: removedAttachments } },
              //   }),
              // },
            },
            { new: true }
          );
        }
        res.status(200).json({
          success: true,
          data: journal,
        });
      } catch (err) {
        next(err);
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = addNotes;
