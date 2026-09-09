const homeInit = Home.init()
const roomInit = Room.init(route)

return {
  model: {
    home: homeInit.model,
    room: roomInit.model,
  },
  commands: [
    ...Command.mapMessages(homeInit.commands, toGotHomeMessage),
    ...Command.mapMessages(roomInit.commands, toGotRoomMessage),
  ],
}
