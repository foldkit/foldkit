// ✅ Good: the Message records the click. The Command names the work.

const Message = defineMessageUnion({
  ClickedRefresh: {},
})

const handlers = {
  ClickedRefresh: () => ({ model, commands: [FetchWeather()] }),
}
