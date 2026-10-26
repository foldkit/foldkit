// ❌ Bad: module state owns the WebSocket outside the Runtime.

let socket: WebSocket | undefined

const update = ApplicationComposition.makeUpdate({
  JoinedRoom: (model, { roomId }) => {
    socket = new WebSocket(`/rooms/${roomId}`)
    return { model }
  },
  LeftRoom: model => {
    socket?.close()
    socket = undefined
    return { model }
  },
})
