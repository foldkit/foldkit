import { Array, Match, Option } from 'effect'
import { AsyncData } from 'foldkit'

import { type NavPage, allPages, isNavPageActive } from './docsNav'
import { ApiReference, Blog } from './page'
import { AppRoute } from './route'

const SITE_NAME = 'Foldkit'

const findNavPage = (route: AppRoute): Option.Option<NavPage> =>
  Array.findFirst(allPages, page => isNavPageActive(route, page))

const resolveApiModuleName = (
  apiData: ApiReference.ApiDataAsyncData,
  moduleSlug: string,
): string =>
  Option.match(AsyncData.getData(apiData), {
    onSome: data =>
      Option.match(ApiReference.resolveModule(data.parsedApi, moduleSlug), {
        onSome: ({ name }) => name,
        onNone: () => ApiReference.slugToModuleName(moduleSlug),
      }),
    onNone: () => ApiReference.slugToModuleName(moduleSlug),
  })

export const routeTitle = (
  route: AppRoute,
  apiData: ApiReference.ApiDataAsyncData,
): string =>
  Match.value(route).pipe(
    Match.tag('Home', () => SITE_NAME),
    Match.tag('Newsletter', () => `Newsletter | ${SITE_NAME}`),
    Match.tag('Blog', () => `Blog | ${SITE_NAME}`),
    Match.tag('UiOverview', () => `Foldkit UI | ${SITE_NAME}`),
    Match.tag('AiOverview', () => `AI | ${SITE_NAME}`),
    Match.tag('Testing', () => `Testing | ${SITE_NAME}`),
    Match.tag('Examples', () => `Examples | ${SITE_NAME}`),
    Match.tag('BlogPost', ({ postSlug }) =>
      Option.match(Blog.findPostBySlug(postSlug), {
        onNone: () => `Not Found | ${SITE_NAME}`,
        onSome: ({ frontmatter }) =>
          `${frontmatter.title} | Blog | ${SITE_NAME}`,
      }),
    ),
    Match.tag('NotFound', () => `Not Found | ${SITE_NAME}`),
    Match.tag(
      'ApiModule',
      ({ moduleSlug }) =>
        `${resolveApiModuleName(apiData, moduleSlug)} | API | ${SITE_NAME}`,
    ),
    Match.tag('ExampleDetail', exampleDetailRoute =>
      Option.match(findNavPage(exampleDetailRoute), {
        onNone: () =>
          `${exampleDetailRoute.exampleSlug} | Examples | ${SITE_NAME}`,
        onSome: ({ label }) => `${label} | Examples | ${SITE_NAME}`,
      }),
    ),
    Match.tag('Playground', ({ exampleSlug }) =>
      Option.match(findNavPage(AppRoute.ExampleDetail({ exampleSlug })), {
        onNone: () => `Playground | ${SITE_NAME}`,
        onSome: ({ label }) => `${label} | Playground | ${SITE_NAME}`,
      }),
    ),
    Match.orElse(route =>
      Option.match(findNavPage(route), {
        onNone: () => SITE_NAME,
        onSome: page => `${page.label} | ${SITE_NAME}`,
      }),
    ),
  )
