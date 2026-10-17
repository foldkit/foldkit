// ❌ Bad: module state owns the WebSocket outside the Runtime.

let socket: WebSocket | undefined

const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    JoinedRoom: ({ roomId }) => {
      socket = new WebSocket(`/rooms/${roomId}`)
      return { model }
    },
    LeftRoom: () => {
      socket?.close()
      socket = undefined
      return { model }
    },
  }),
)
