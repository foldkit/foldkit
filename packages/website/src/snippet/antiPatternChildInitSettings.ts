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

export const update = (model: Model, message: Message) =>
  Message.match<Update.ReturnWithOutMessage<Model, Message, OutMessage>>(
    message,
    {
      RestoredTheme: ({ theme }) => ({
        model: modifyFields(model, { theme: () => theme }),
        commands: [RefreshAvailableThemes()],
        outMessage: OutMessage.RestoredTheme({ theme }),
      }),
      CompletedRefreshAvailableThemes: () => ({ model }),
    },
  )

export const boot = ({ theme }: BootArgs) =>
  update(init().model, Message.RestoredTheme({ theme }))
