// ❌ Bad: module state owns the WebSocket outside the Runtime.

let socket: WebSocket | undefined

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    JoinedRoom: ({ roomId }) => {
      socket = new WebSocket(`/rooms/${roomId}`)
      return { model }
    },
    LeftRoom: () => {
      socket?.close()
      socket = undefined
      return { model }
    },
  })
