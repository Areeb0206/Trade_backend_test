const getImportMessage = ({ importedTrades, totalTrades, duplicateTrades }) => {
  if (importedTrades === 0) {
    return {
      type: "success",
      message: "There were no executions to import.",
    };
  }

  if (duplicateTrades === 0) {
    return {
      type: "success",
      message: `${importedTrades} executions imported successfully.`,
    };
  }

  return {
    type: "success",
    message: `${importedTrades} of ${totalTrades} entries imported. ${duplicateTrades} were ignored due to duplication.`,
  };
};

module.exports = {
  getImportMessage,
};
