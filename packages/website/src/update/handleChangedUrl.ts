import { Array, Option, Record } from 'effect'
import { Update } from 'foldkit'
import { initAndSet } from 'foldkit/bindingInit'
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
import { makeCommandsStep, makeFieldsStep, makeStep } from '../definition'
import { findActiveSectionKeyForRoute } from '../docsNav'
import type { Message } from '../message'
import { type Model } from '../model'
import {
  ApplicationRoute,
  type ApplicationTransition,
  urlToApplicationRoute,
} from '../route'

type ChangedUrlMessage = typeof Message.ChangedUrl.Type

type ChangedUrl = ChangedUrlMessage

export const handleChangedUrlStep = makeStep((model, { url }: ChangedUrl) => {
  const { route: previousRoute } = model
  const nextRoute = urlToApplicationRoute(url)
  const transition = Transition.make(previousRoute, nextRoute)
  const isDifferentPathname = model.url.pathname !== url.pathname

  return Update.combineSteps([
    makeFieldsStep(stepModel => ({
      route: () => nextRoute,
      url: () => url,
      sidebarGroups: () => nextSidebarGroups(stepModel, nextRoute),
    })),
    reconcileHomeStep(transition),
    reconcilePlaygroundStep(transition),
    MobileMenuDialogBinding.requestClose(),
    ThemeMenuBinding.requestClose(),
    SearchBinding.informRouteChanged(),
    loadRouteDataStep(transition),
    scrollAfterUrlChangeStep(url, isDifferentPathname),
  ])
})

const nextSidebarGroups = (model: Model, nextRoute: ApplicationRoute) =>
  Option.match(findActiveSectionKeyForRoute(nextRoute), {
    onNone: () => model.sidebarGroups,
    onSome: activeSectionKey =>
      Option.contains(Record.get(model.sidebarGroups, activeSectionKey), true)
        ? model.sidebarGroups
        : Record.set(model.sidebarGroups, activeSectionKey, true),
  })

const reconcileHomeStep = (transition: ApplicationTransition) =>
  makeStep(model => {
    if (Transition.isEntering(transition, 'Home')) {
      return initAndSet(HomeBinding, model, { args: [] })
    }

    if (Option.isSome(Transition.exited(transition, 'Home'))) {
      return {
        model: modifyFields(model, { maybeHome: () => Option.none() }),
      }
    }

    return { model }
  })

const reconcilePlaygroundStep = (transition: ApplicationTransition) =>
  makeStep(model => {
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

    return initAndSet(PlaygroundBinding, model, {
      args: [nextRoute.exampleSlug, model.maybeIsPlaygroundSupported],
    })
  })

const loadRouteDataStep = (transition: ApplicationTransition) =>
  makeStep(model =>
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

const scrollAfterUrlChangeStep = (url: Url, isChangingPathname: boolean) => {
  if (Option.isSome(url.hash)) {
    const hash = url.hash.value

    return makeCommandsStep(() => [
      Command.ScrollToAnchor({ hash }),
      ...Array.filter(
        [Command.ScrollSidebarActiveLinkIntoView()],
        () => isChangingPathname,
      ),
    ])
  }

  return makeCommandsStep(() =>
    Array.filter(
      [Command.ScrollToTop(), Command.ScrollSidebarActiveLinkIntoView()],
      () => isChangingPathname,
    ),
  )
}
