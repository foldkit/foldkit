import { Runtime } from 'foldkit'

export const viewTransition: Runtime.ViewTransitionConfig<Model, Message> = ({
  model,
  message,
}) => {
  if (message._tag !== 'ChangedUrl') {
    return false
  }

  const direction = model.route._tag === 'Artwork' ? 'to-detail' : 'to-gallery'
  return { types: [direction] }
}
