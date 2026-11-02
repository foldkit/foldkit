import { Match, Option } from 'effect'
import type { Document } from 'foldkit/html'

import { PreviewBanner, Shared } from '../component'
import { Deployment } from '../deployment'
import { Docs, Marketing } from '../layout'
import { Message } from '../message'
import { type Model } from '../model'
import { type Home, Newsletter } from '../page'
import { routeToCanonicalUrl } from '../route'
import { routeTitle } from '../routeTitle'
import * as SnippetCopyRenderer from '../snippetCopyRenderer'
import * as SnippetDisclosureRenderer from '../snippetDisclosureRenderer'
import * as Blog from './blog'
import type { ApplicationViewBuilder } from './builder'

const homeView = (model: Model, home: Home, h: ApplicationViewBuilder) => {
  const renderCopyButton = SnippetCopyRenderer.renderer(model.snippetCopy)
  const content = home.view({
    renderCopyButton,
    renderSnippet: SnippetDisclosureRenderer.renderer(
      model.snippetDisclosure,
      renderCopyButton,
    ),
    isNarrowViewport: model.isNarrowViewport,
    maybeGitHubStarCount: model.maybeGitHubStarCount,
    resolvedTheme: model.resolvedTheme,
    isBrowserEnvironmentLoaded: Option.isSome(model.maybeThemePreference),
    newsletterEmail: model.newsletterEmail,
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

const newsletterView = (model: Model, h: ApplicationViewBuilder) =>
  Marketing.view(
    model,
    {
      content: Newsletter.content(
        model.newsletterEmail,
        value => Message.UpdatedNewsletterEmail({ value }),
        h,
      ),
      mainClassName:
        'flex-1 flex items-center justify-center px-6 pb-20 pt-[calc(var(--header-height)+5rem)] md:px-12 lg:px-20',
      isPagefindBody: false,
    },
    h,
  )

export const view = (model: Model, h: ApplicationViewBuilder): Document => {
  const body = Match.value(model.route).pipe(
    Match.tag('Home', () =>
      Option.match(model.maybeHome, {
        onNone: () => h.empty,
        onSome: home => homeView(model, home, h),
      }),
    ),
    Match.tag('Newsletter', () => newsletterView(model, h)),
    Match.tag('Blog', 'BlogPost', route => Blog.view(model, route, h)),
    Match.tag('Playground', () =>
      Option.match(model.playground, {
        onNone: () => h.empty,
        onSome: playground =>
          playground.view({
            maybeIsPlaygroundSupported: model.maybeIsPlaygroundSupported,
          }),
      }),
    ),
    Match.orElse(route => Docs.view(model, route, h)),
  )

  return {
    title: routeTitle(model.route, model.apiReference.model.apiData),
    canonical: routeToCanonicalUrl(model.route),
    body: Deployment.match(model.deployment, {
      Production: () => body,
      Canary: ({ commit }) => h.div([], [body, Shared.canaryBanner(commit)]),
      Preview: ({ release }) => h.div([], [body, PreviewBanner.view(release)]),
    }),
  }
}
