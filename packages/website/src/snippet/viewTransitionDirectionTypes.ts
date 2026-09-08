import { Option } from 'effect'
import { Runtime } from 'foldkit'
import { Transition } from 'foldkit/route'

export const viewTransition: Runtime.ViewTransitionConfig<Model, Message> = ({
  previousModel,
  model,
  message,
}) => {
  if (message._tag !== 'ChangedUrl') {
    return false
  }

  const transition = Transition.make(previousModel.route, model.route)

  // Every arm past the guard is a navigation, so none of them return `false`.
  // `true` is "animate, with no direction to declare": an untyped transition
  // still cross-fades, it just does not slide. Moving between two artworks
  // enters no route at all, which is `onNone`. Adding a route to AppRoute is a
  // compile error here until it is given a direction.
  return Option.match(Transition.enteredAny(transition), {
    onNone: () => true,
    onSome: AppRoute.match<Runtime.ViewTransitionDecision>({
      Artwork: () => ({ types: ['to-artwork-detail'] }),
      Gallery: () => ({ types: ['to-gallery'] }),
      NotFound: () => true,
    }),
  })
}
