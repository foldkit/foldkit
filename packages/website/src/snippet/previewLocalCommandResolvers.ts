const completeFetch = Story.Command.resolveAll([
  FetchCount,
  Message.SucceededFetchCount({ count: 7 }),
])

Story.story(
  subject,
  Story.init(),
  Story.message(Message.ClickedFetch()),
  completeFetch,
  Story.message(Message.ClickedFetch()),
  completeFetch,
)
