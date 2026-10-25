import { Array, Option, Record } from 'effect'
import { Update } from 'foldkit'
import { Transition } from 'foldkit/route'
import { modifyFields } from 'foldkit/struct'
import { type Url } from 'foldkit/url'

import * as Command from '../command'
import {
  ApiReferenceBinding,
  ExampleDetailBinding,
  HomeBinding,
  MobileMenuDialogBinding,
  PlaygroundBinding,
  SearchBinding,
  ThemeMenuBinding,
} from '../composition'
import { ApplicationDefinition } from '../definition'
import { findActiveSectionKeyForRoute } from '../docsNav'
import type { Message } from '../message'
import { type Model } from '../model'
import { ApplicationRoute, urlToApplicationRoute } from '../route'

type ApplicationTransition = Transition.Transition<typeof ApplicationRoute.Type>

export const handleChangedUrl = ApplicationDefinition.makeStep(
  (model, { url }: typeof Message.ChangedUrl.Type) => {
    const { route: previousRoute } = model
    const nextRoute = urlToApplicationRoute(url)
    const transition = Transition.make(previousRoute, nextRoute)
    const isDifferentPathname = model.url.pathname !== url.pathname

    return Update.combineSteps([
      ApplicationDefinition.makeFieldsStep(stepModel => ({
        route: () => nextRoute,
        url: () => url,
        sidebarGroups: () => nextSidebarGroups(stepModel, nextRoute),
      })),
      stepHome(transition),
      stepPlayground(transition),
      MobileMenuDialogBinding.requestClose(),
      ThemeMenuBinding.requestClose(),
      SearchBinding.informRouteChanged(),
      loadRouteData(transition),
      scrollAfterUrlChange(url, isDifferentPathname),
    ])
  },
)

const nextSidebarGroups = (
  model: typeof Model.Type,
  nextRoute: typeof ApplicationRoute.Type,
) =>
  Option.match(findActiveSectionKeyForRoute(nextRoute), {
    onNone: () => model.sidebarGroups,
    onSome: activeSectionKey =>
      Option.contains(Record.get(model.sidebarGroups, activeSectionKey), true)
        ? model.sidebarGroups
        : Record.set(model.sidebarGroups, activeSectionKey, true),
  })

const stepHome = (transition: ApplicationTransition) =>
  ApplicationDefinition.makeStep(model => {
    if (Transition.isEntering(transition, 'Home')) {
      return HomeBinding.init({
        args: [],
        toParentModel: home =>
          modifyFields(model, { maybeHome: () => Option.some(home) }),
      })
    }

    if (Option.isSome(Transition.exited(transition, 'Home'))) {
      return {
        model: modifyFields(model, { maybeHome: () => Option.none() }),
      }
    }

    return { model }
  })

const stepPlayground = (transition: ApplicationTransition) =>
  ApplicationDefinition.makeStep(model => {
    const { nextRoute } = transition

    if (nextRoute._tag !== 'Playground') {
      return {
        model: modifyFields(model, { playground: () => Option.none() }),
      }
    }

    if (
      Option.exists(
        Transition.stayed(transition, 'Playground'),
        ({ previousRoute, nextRoute }) =>
          previousRoute.exampleSlug === nextRoute.exampleSlug,
      )
    ) {
      return { model }
    }

    return PlaygroundBinding.init({
      args: [nextRoute.exampleSlug, model.maybeIsPlaygroundSupported],
      toParentModel: playground =>
        modifyFields(model, { playground: () => Option.some(playground) }),
    })
  })

const loadRouteData = (transition: ApplicationTransition) =>
  ApplicationDefinition.makeStep(model =>
    ApplicationRoute.matchOrElse(
      transition.nextRoute,
      {
        ApiModule: () => {
          if (
            Option.exists(
              Transition.stayed(transition, 'ApiModule'),
              ({ previousRoute, nextRoute }) =>
                previousRoute.moduleSlug === nextRoute.moduleSlug,
            )
          ) {
            return { model }
          }

          return ApiReferenceBinding.informRouteChanged()
        },
        ExampleDetail: ({ exampleSlug }) => {
          if (
            Option.exists(
              Transition.stayed(transition, 'ExampleDetail'),
              ({ previousRoute, nextRoute }) =>
                previousRoute.exampleSlug === nextRoute.exampleSlug,
            )
          ) {
            return { model }
          }

          return ExampleDetailBinding.informRouteChanged({ slug: exampleSlug })
        },
      },
      () => ({ model }),
    ),
  )

const scrollAfterUrlChange = (url: Url, isChangingPathname: boolean) => {
  if (Option.isSome(url.hash)) {
    const hash = url.hash.value

    return ApplicationDefinition.makeCommandsStep(() => [
      Command.ScrollToAnchor({ hash }),
      ...Array.filter(
        [Command.ScrollSidebarActiveLinkIntoView()],
        () => isChangingPathname,
      ),
    ])
  }

  return ApplicationDefinition.makeCommandsStep(() =>
    Array.filter(
      [Command.ScrollToTop(), Command.ScrollSidebarActiveLinkIntoView()],
      () => isChangingPathname,
    ),
  )
}
