const MessageApi = {
  defineMessageUnion: <Cases>(cases: Cases): Cases => cases,
}

const Message = MessageApi.defineMessageUnion({
  GotSettingsMessage: {
    message: 'settings',
    timestamp: 'now',
  },
})

export { Message }
