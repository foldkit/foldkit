import { Array, Option, Record, pipe } from 'effect'
import { Transition } from 'foldkit/route'
import { modifyFields } from 'foldkit/struct'
import { type Url } from 'foldkit/url'

import { Dialog } from '@foldkit/ui'

import * as Command from '../command'
import { findActiveSectionKeyForRoute } from '../docsNav'
import type { Message } from '../message'
import { type Model } from '../model'
import {
  ApiReference,
  ExampleDetail,
  type Home,
  type Playground,
} from '../page'
import {
  ApplicationRoute,
  type ApplicationTransition,
  urlToApplicationRoute,
} from '../route'
import { Search } from '../search'
import { ThemeMenu } from '../view/themeMenu'

type ChangedUrl = typeof Message.ChangedUrl.Type

export type RouteChildren = Readonly<{
  home: Home
  playgroundFor: (
    slug: string,
    maybeIsSupported: Option.Option<boolean>,
  ) => Playground
}>

const nextSidebarGroups = (model: Model, nextRoute: ApplicationRoute) =>
  Option.match(findActiveSectionKeyForRoute(nextRoute), {
    onNone: () => model.sidebarGroups,
    onSome: activeSectionKey =>
      Option.contains(Record.get(model.sidebarGroups, activeSectionKey), true)
        ? model.sidebarGroups
        : Record.set(model.sidebarGroups, activeSectionKey, true),
  })

const reconcileHome =
  (transition: ApplicationTransition, home: Home) =>
  (model: Model): Model => {
    if (Transition.isEntering(transition, 'Home')) {
      return modifyFields(model, { maybeHome: () => Option.some(home) })
    }

    if (Option.isSome(Transition.exited(transition, 'Home'))) {
      return modifyFields(model, { maybeHome: () => Option.none() })
    }

    return model
  }

const reconcilePlayground =
  (
    transition: ApplicationTransition,
    playgroundFor: RouteChildren['playgroundFor'],
  ) =>
  (model: Model): Model => {
    const { nextRoute } = transition

    if (nextRoute._tag !== 'Playground') {
      return modifyFields(model, { playground: () => Option.none() })
    }

    if (
      Option.exists(
        Transition.stayed(transition, 'Playground'),
        ({ previousRoute, nextRoute }) =>
          previousRoute.exampleSlug === nextRoute.exampleSlug,
      )
    ) {
      return model
    }

    return modifyFields(model, {
      playground: () =>
        Option.some(
          playgroundFor(
            nextRoute.exampleSlug,
            model.maybeIsPlaygroundSupported,
          ),
        ),
    })
  }

const routeDataMessages = (model: Model, transition: ApplicationTransition) =>
  ApplicationRoute.matchOrElse(
    transition.nextRoute,
    {
      ApiModule: () =>
        Option.exists(
          Transition.stayed(transition, 'ApiModule'),
          ({ previousRoute, nextRoute }) =>
            previousRoute.moduleSlug === nextRoute.moduleSlug,
        )
          ? []
          : [
              model.apiReference.send(
                ApiReference.Message.InformedOfRouteChange(),
              ),
            ],
      ExampleDetail: ({ exampleSlug }) =>
        Option.exists(
          Transition.stayed(transition, 'ExampleDetail'),
          ({ previousRoute, nextRoute }) =>
            previousRoute.exampleSlug === nextRoute.exampleSlug,
        )
          ? []
          : [
              model.exampleDetail.send(
                ExampleDetail.Message.InformedOfRouteChange({
                  slug: exampleSlug,
                }),
              ),
            ],
    },
    () => [],
  )

const scrollCommands = (url: Url, isChangingPathname: boolean) => {
  if (Option.isSome(url.hash)) {
    return [
      Command.ScrollToAnchor({ hash: url.hash.value }),
      ...Array.filter(
        [Command.ScrollSidebarActiveLinkIntoView()],
        () => isChangingPathname,
      ),
    ]
  }

  return Array.filter(
    [Command.ScrollToTop(), Command.ScrollSidebarActiveLinkIntoView()],
    () => isChangingPathname,
  )
}

export const handleChangedUrl =
  ({ home, playgroundFor }: RouteChildren) =>
  (model: Model, { url }: ChangedUrl) => {
    const nextRoute = urlToApplicationRoute(url)
    const transition = Transition.make(model.route, nextRoute)
    const isDifferentPathname = model.url.pathname !== url.pathname

    const nextModel = pipe(
      modifyFields(model, {
        route: () => nextRoute,
        url: () => url,
        sidebarGroups: () => nextSidebarGroups(model, nextRoute),
      }),
      reconcileHome(transition, home),
      reconcilePlayground(transition, playgroundFor),
    )

    return {
      model: nextModel,
      commands: scrollCommands(url, isDifferentPathname),
      messages: [
        nextModel.mobileMenuDialog.send(Dialog.Dialog.Message.RequestedClose()),
        nextModel.themeMenu.send(ThemeMenu.Message.RequestedClose()),
        nextModel.search.send(Search.Message.InformedOfRouteChange()),
        ...routeDataMessages(nextModel, transition),
      ],
    }
  }
