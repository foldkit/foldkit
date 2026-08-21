import { Update } from 'foldkit'

const foldLoginOutMessage = (
  outMessage: Login.OutMessage,
  { liftCommand }: Update.FoldContext<Login.Message, Message>,
) =>
  Login.OutMessage.match<Update.Step<Model, Message>>(outMessage, {
    RequestedMagicLink:
      ({ email }) =>
      model => ({
        model,
        commands: [
          liftCommand(
            Login.SendMagicLink({ email, redirectRoute: model.route }),
          ),
        ],
      }),
  })
