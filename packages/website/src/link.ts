const exampleBase = 'https://github.com/foldkit/foldkit/tree/main/examples'

export const exampleSourceHref = (slug: string): string =>
  `${exampleBase}/${slug}/src/main.ts`

export const exampleStackBlitzHref = (slug: string): string =>
  `https://stackblitz.com/github/foldkit/foldkit?file=examples/${slug}/src/main.ts&startScript=dev:example:${slug}`

export const uiShowcaseViewSourceHref = (slug: string): string =>
  `https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/view/${slug}.ts`

export const Link = {
  elm: 'https://elm-lang.org',
  elmArchitecture: 'https://guide.elm-lang.org/architecture/',
  effect: 'https://effect.website',
  effectSchema: 'https://effect.website/docs/schema/introduction/',
  effectMatch: 'https://effect.website/docs/code-style/pattern-matching/',
  effectService:
    'https://effect.website/docs/requirements-management/services/',
  react: 'https://react.dev',
  vue: 'https://vuejs.org',
  angular: 'https://angular.dev',
  svelte: 'https://svelte.dev',
  solid: 'https://solidjs.com',
  snabbdom: 'https://github.com/snabbdom/snabbdom',
  foldkitVdom:
    'https://github.com/foldkit/foldkit/blob/main/packages/foldkit/src/vdom.ts',
  foldkitExamples: exampleBase,
  exampleAuthLogin: `${exampleBase}/auth/src/page/loggedOut/page/login.ts`,
  exampleSnakeRequestPattern:
    'https://github.com/foldkit/foldkit/blob/main/examples/snake/src/main.ts#L220-L234',
  exampleWeatherFetch:
    'https://github.com/foldkit/foldkit/blob/main/examples/weather/src/main.ts#L123-L177',
  typingTerminal: 'https://typingterminal.com',
  typingTerminalSource:
    'https://github.com/foldkit/foldkit/tree/main/packages/typing-game',
  typingTerminalRoomSource:
    'https://github.com/foldkit/foldkit/tree/main/packages/typing-game/client/src/page/room',
  createFoldkitApp:
    'https://github.com/foldkit/foldkit/tree/main/packages/create-foldkit-app',
  msw: 'https://mswjs.io',
  github: 'https://github.com/foldkit/foldkit',
  foldkitSource:
    'https://github.com/foldkit/foldkit/tree/main/packages/foldkit',
  npm: 'https://www.npmjs.com/package/foldkit',
  websiteSource:
    'https://github.com/foldkit/foldkit/tree/main/packages/website',
  changelog:
    'https://github.com/foldkit/foldkit/blob/main/packages/foldkit/CHANGELOG.md',
}
