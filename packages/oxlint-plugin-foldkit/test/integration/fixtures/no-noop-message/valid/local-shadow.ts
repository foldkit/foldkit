const MessageApi = {
  defineMessageUnion: <Cases>(cases: Cases): Cases => cases,
}

const Message = MessageApi.defineMessageUnion({
  NoOp: {},
})

export { Message }
