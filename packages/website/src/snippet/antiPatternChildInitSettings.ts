// settings.ts

export const Theme = Schema.Literals(['Light', 'Dark'])
export type Theme = typeof Theme.Type

const BootArgs = Schema.Struct({ theme: Theme })
type BootArgs = typeof BootArgs.Type

export const Message = defineMessageUnion({
  RestoredTheme: { theme: Theme },
  CompletedRefreshAvailableThemes: {},
})

export const OutMessage = defineMessageUnion({
  RestoredTheme: { theme: Theme },
})

export const init = () => ({ model: Model.make({ theme: 'Light' }) })

export const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    RestoredTheme: ({ theme }) => ({
      model: modifyFields(model, { theme: () => theme }),
      commands: [RefreshAvailableThemes()],
      outMessage: OutMessage.RestoredTheme({ theme }),
    }),
    CompletedRefreshAvailableThemes: () => ({ model }),
  }),
)

export const boot = ({ theme }: BootArgs) =>
  update(init().model, Message.RestoredTheme({ theme }))
