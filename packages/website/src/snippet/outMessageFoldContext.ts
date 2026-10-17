import type { Update } from 'foldkit'

const foldLoginOutMessage = (
  outMessage: Login.OutMessage,
  { liftCommand }: Update.FoldContext<Login.Message, Message>,
) =>
  Login.OutMessage.match(outMessage, {
    RequestedMagicLink: ({ email }) =>
      Application.step(model => ({
        model,
        commands: [
          liftCommand(
            Login.SendMagicLink({ email, redirectRoute: model.route }),
          ),
        ],
      })),
  })
