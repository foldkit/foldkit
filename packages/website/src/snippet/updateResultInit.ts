const homeInit = Home.init()

return {
  model: { home: homeInit.model },
  commands: Command.mapMessages(homeInit.commands, message =>
    Message.GotHomeMessage({ message }),
  ),
}
