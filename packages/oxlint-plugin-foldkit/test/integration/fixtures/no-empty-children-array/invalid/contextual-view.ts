import { Submodel } from 'foldkit'

export const view = Submodel.defineView<Model, Message>((_model, h) =>
  h.div([], []),
)
