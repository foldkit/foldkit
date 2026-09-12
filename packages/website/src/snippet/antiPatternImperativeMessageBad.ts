// ❌ Bad: FetchWeather tells update what to do, not what happened.

const Message = defineMessageUnion({
  FetchWeather: {},
})

const handlers = {
  FetchWeather: () => ({ model, commands: [FetchWeather()] }),
}
