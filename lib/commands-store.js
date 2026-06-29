let commandQueue = [];

function addCommand(command) {
  const fullCommand = {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    ...command,
    createdAt: Date.now()
  };

  commandQueue.push(fullCommand);
  return fullCommand;
}

function getNextCommand() {
  return commandQueue.shift() || null;
}

module.exports = {
  addCommand,
  getNextCommand
};