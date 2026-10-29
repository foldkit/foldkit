import { Match, Option } from 'effect'

import { PreviewBanner, Shared } from '../component'
import type { ApplicationViewBuilder } from '../composition'
import {
  ApplicationComposition,
  HomeBinding,
  PlaygroundBinding,
  SnippetCopyBinding,
  SnippetDisclosureBinding,
} from '../composition'
import { Deployment } from '../deployment'
import { Docs, Marketing } from '../layout'
import { Message } from '../message'
import { type Model } from '../model'
import { HomeBlock, Newsletter } from '../page'
import { routeToCanonicalUrl } from '../route'
import { routeTitle } from '../routeTitle'
import * as SnippetCopyRenderer from '../snippetCopyRenderer'
import * as SnippetDisclosureRenderer from '../snippetDisclosureRenderer'
import * as Blog from './blog'

type HomeBlockModel = typeof HomeBlock.Model.Type

type HomeViewInput = Readonly<{
  model: Model
  homeModel: HomeBlockModel
}>

const homeView = (
  { model, homeModel }: HomeViewInput,
  h: ApplicationViewBuilder,
) => {
  const renderCopyButton = SnippetCopyRenderer.renderer(
    model.snippetCopy,
    config => h.block(SnippetCopyBinding.embedView(config)),
  )
  const content = h.block(
    HomeBinding.embedView({
      slotId: 'home',
      model: homeModel,
      viewInputs: {
        renderCopyButton,
        renderSnippet: SnippetDisclosureRenderer.renderer(
          model.snippetDisclosure,
          renderCopyButton,
          config => h.block(SnippetDisclosureBinding.embedView(config)),
        ),
        isNarrowViewport: model.isNarrowViewport,
        maybeGitHubStarCount: model.maybeGitHubStarCount,
        resolvedTheme: model.resolvedTheme,
        isBrowserEnvironmentLoaded: Option.isSome(model.maybeThemePreference),
        newsletterEmail: model.newsletterEmail,
      },
    }),
  )

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

export const view = ApplicationComposition.makeView((model, h) => {
  const body = Match.value(model.route).pipe(
    Match.tag('Home', () =>
      Option.match(model.maybeHome, {
        onNone: () => h.empty,
        onSome: homeModel => homeView({ model, homeModel }, h),
      }),
    ),
    Match.tag('Newsletter', () => newsletterView(model, h)),
    Match.tag('Blog', 'BlogPost', route => Blog.view(model, route, h)),
    Match.tag('Playground', () =>
      Option.match(model.playground, {
        onNone: () => h.empty,
        onSome: playgroundModel =>
          h.block(
            PlaygroundBinding.embedView({
              slotId: `playground-${playgroundModel.slug}`,
              model: playgroundModel,
              viewInputs: {
                maybeIsPlaygroundSupported: model.maybeIsPlaygroundSupported,
              },
            }),
          ),
      }),
    ),
    Match.orElse(route => Docs.view(model, route, h)),
  )

  return {
    title: routeTitle(model.route, model.apiReference.apiData),
    canonical: routeToCanonicalUrl(model.route),
    body: Deployment.match(model.deployment, {
      Production: () => body,
      Canary: ({ commit }) => h.div([], [body, Shared.canaryBanner(commit)]),
      Preview: ({ release }) => h.div([], [body, PreviewBanner.view(release)]),
    }),
  }
})
