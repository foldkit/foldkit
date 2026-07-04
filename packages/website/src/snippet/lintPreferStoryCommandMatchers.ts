import { Story } from 'foldkit/test'

// ❌ Bad
// A hand-rolled command assertion ignores Foldkit command identity and
// unresolved-command coverage.
const badAssertion = (commands: ReadonlyArray<unknown>) => {
  expect(commands[0]).toMatchObject({ name: 'FetchWeather' })
}

// ✅ Good
Story.Command.expectHas(FetchWeather)
