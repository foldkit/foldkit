import { Match, Option } from 'effect'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import { Shared } from '../component'
import { Deployment } from '../deployment'
import { Docs, Marketing } from '../layout'
import { Message } from '../message'
import { type Model } from '../model'
import { Home, Newsletter, Playground } from '../page'
import { routeTitle } from '../routeTitle'
import * as SnippetCopy from '../snippetCopy'
import * as Blog from './blog'

const homeView = (
  model: Model,
  homeModel: Home.Model,
  h: HtmlBuilder<Message>,
) => {
  const content = h.submodel({
    slotId: 'home',
    model: homeModel,
    view: Home.view,
    viewInputs: {
      renderCopyButton: SnippetCopy.renderer(
        model.snippetCopy,
        message => Message.GotSnippetCopyMessage({ message }),
        h,
      ),
      isNarrowViewport: model.isNarrowViewport,
      maybeIsChromium: model.maybeIsChromium,
      maybeGitHubStarCount: model.maybeGitHubStarCount,
    },
    toParentMessage: message => Message.GotHomeMessage({ message }),
  })

  return Marketing.view(
    model,
    {
      content,
      mainClassName: 'flex-1 pt-[var(--header-height)]',
      isPagefindBody: true,
    },
    h,
  )
}

const newsletterView = (model: Model, h: HtmlBuilder<Message>) =>
  Marketing.view(
    model,
    {
      content: Newsletter.content,
      mainClassName:
        'flex-1 flex items-center justify-center px-6 pb-20 pt-[calc(var(--header-height)+5rem)] md:px-12 lg:px-20',
      isPagefindBody: false,
    },
    h,
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const body = Match.value(model.route).pipe(
    Match.tag('Home', () =>
      Option.match(model.maybeHome, {
        onNone: () => h.empty,
        onSome: homeModel => homeView(model, homeModel, h),
      }),
    ),
    Match.tag('Newsletter', () => newsletterView(model, h)),
    Match.tag('Blog', 'BlogPost', route => Blog.view(model, route, h)),
    Match.tag('Playground', () =>
      Option.match(model.playground, {
        onNone: () => h.empty,
        onSome: playgroundModel =>
          h.submodel({
            slotId: `playground-${playgroundModel.slug}`,
            model: playgroundModel,
            view: Playground.view,
            viewInputs: { maybeIsChromium: model.maybeIsChromium },
            toParentMessage: message =>
              Message.GotPlaygroundMessage({ message }),
          }),
      }),
    ),
    Match.orElse(route => Docs.view(model, route, h)),
  )

  return {
    title: routeTitle(model.route, model.apiReference.apiData),
    body: Deployment.match(model.deployment, {
      Production: () => body,
      Canary: ({ commit }) => h.div([], [body, Shared.canaryBanner(commit)]),
    }),
  }
}
