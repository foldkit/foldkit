// @vitest-environment node
import { Effect, Schema, SchemaIssue, SchemaTransformation } from 'effect'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import type { Document } from '../../html/index.js'
import type { Html } from '../../html/index.js'
import { __htmlBuilder, customElement } from '../../html/index.js'
import type { RoutingApplicationConfigWithFlags } from '../../runtime/runtime.js'
import type { Url } from '../../url/index.js'
import type { VNode } from '../../vdom.js'
import {
  FOLDKIT_APP_ATTRIBUTE,
  FOLDKIT_FLAGS_ATTRIBUTE,
  renderToString as renderToStringWithOptions,
} from './server.js'

const h = __htmlBuilder<never>()

// NOTE: a hydratable render requires the deployment's build id, which every
// case here supplies through this wrapper so each test keeps exercising what it
// was written for. The contract itself is covered by its own cases below.
const BUILD_ID = 'test-build-id'

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const renderToString = (config: any, options?: any) =>
  /* eslint-disable-next-line @typescript-eslint/no-unsafe-argument */
  renderToStringWithOptions(config, { buildId: BUILD_ID, ...options })

// The same call a JavaScript caller makes, or one compiled before the build id
// existed: the options reach the function exactly as written, so the runtime
// checks are what answers rather than the compiler.
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const renderToStringUnchecked = (config: any, options?: any) =>
  /* eslint-disable-next-line @typescript-eslint/no-unsafe-argument */
  renderToStringWithOptions(config, options)

const Flags = Schema.Struct({
  theme: Schema.String,
})
type Flags = typeof Flags.Type

const Model = Schema.Struct({
  theme: Schema.String,
  pathname: Schema.String,
})
type Model = typeof Model.Type

const view = (model: Model): Document => ({
  title: `Page ${model.pathname}`,
  canonical: `https://example.com${model.pathname}`,
  body: h.div([h.Class(model.theme)], [h.h1([], [`At ${model.pathname}`])]),
})

const routingConfig = {
  Flags,
  routing: {},
  init: (
    flags: Flags,
    url: Url,
  ): Readonly<{
    model: Model
    commands?: ReadonlyArray<never>
    outMessage?: never
  }> => ({ model: Model.make({ theme: flags.theme, pathname: url.pathname }) }),
  view,
}

describe('renderToString', () => {
  it.effect('renders a routing application with flags', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString(routingConfig, {
        url: 'https://example.com/settings',
        flags: { theme: 'dark' },
      })

      expect(rendered.html).toContain(
        `<div class="dark" ${FOLDKIT_APP_ATTRIBUTE}="app"`,
      )
      expect(rendered.html).toContain('<h1>At /settings</h1>')
      expect(rendered.title).toBe('Page /settings')
      expect(rendered.canonical).toBe('https://example.com/settings')
    }),
  )

  it.effect('surfaces lang and dir from the Document as attribute values', () =>
    Effect.gen(function* () {
      const localizedView = (model: Model): Document => ({
        title: `Page ${model.pathname}`,
        lang: 'ar',
        dir: 'Rtl',
        body: h.div([], [h.h1([], ['مرحبا'])]),
      })
      const rendered = yield* renderToString(
        { ...routingConfig, view: localizedView },
        { url: 'https://example.com/', flags: { theme: 'dark' } },
      )

      expect(rendered.lang).toBe('ar')
      expect(rendered.dir).toBe('rtl')
    }),
  )

  it.effect('omits lang and dir when the Document does not set them', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString(routingConfig, {
        url: 'https://example.com/',
        flags: { theme: 'dark' },
      })

      expect(rendered.lang).toBeUndefined()
      expect(rendered.dir).toBeUndefined()
    }),
  )

  it.effect('embeds the Schema-encoded flags payload', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString(routingConfig, {
        url: 'https://example.com/',
        flags: { theme: 'light' },
      })

      expect(rendered.html).toContain(
        `<script type="application/json" ${FOLDKIT_FLAGS_ATTRIBUTE}="app">`,
      )
      expect(rendered.html).toContain('{"theme":"light"}')
      expect(rendered.html.match(/data-foldkit-app=/g)?.length).toBe(1)
      expect(rendered.html.match(/data-foldkit-flags=/g)?.length).toBe(1)
    }),
  )

  it.effect('rejects view-authored hydration handoff markers', () =>
    Effect.gen(function* () {
      for (const marker of [
        'data-foldkit-app',
        'data-foldkit-build',
        'data-foldkit-flags',
        'data-foldkit-key',
        'data-foldkit-identity',
      ]) {
        const error = yield* Effect.flip(
          renderToString({
            init: (): Readonly<{
              model: null
              commands?: ReadonlyArray<never>
              outMessage?: never
            }> => ({ model: null }),
            view: () => ({
              title: 'Reserved marker',
              body: h.div([h.Attribute(marker, 'authored')]),
            }),
          }),
        )

        expect(error, marker).toMatchObject({ _tag: 'SerializationError' })
        if (error._tag === 'SerializationError') {
          expect(String(error.cause), marker).toContain(
            'reserved for Foldkit\u2019s server-to-client hydration handoff',
          )
        }
      }
    }),
  )

  it.effect('rejects root and Flags markers hidden inside InnerHTML', () =>
    Effect.gen(function* () {
      for (const fragment of [
        '<div data-foldkit-app="app"></div>',
        '<div data-foldkit-build="test-build-id"></div>',
        '<script type="application/json" data-foldkit-flags="app">{}</script>',
      ]) {
        const error = yield* Effect.flip(
          renderToString({
            init: (): Readonly<{
              model: null
              commands?: ReadonlyArray<never>
              outMessage?: never
            }> => ({ model: null }),
            view: () => ({
              title: 'Reserved marker',
              body: h.div([h.InnerHTML(fragment)]),
            }),
          }),
        )

        expect(error, fragment).toMatchObject({ _tag: 'SerializationError' })
      }
    }),
  )

  it.effect('uses canonical HTML tag casing for InnerHTML parser context', () =>
    Effect.gen(function* () {
      const content = '<div data-foldkit-app="text-only"></div>'
      const rendered = yield* renderToString({
        init: (): Readonly<{
          model: null
          commands?: ReadonlyArray<never>
          outMessage?: never
        }> => ({ model: null }),
        view: () => ({
          title: 'Raw text context',
          body: customElement<never>()('SCRIPT')([
            h.Type('text/plain'),
            h.InnerHTML(content),
          ]),
        }),
      })

      expect(rendered.html).toContain(`>${content}</script>`)
    }),
  )

  it.effect('escapes closing tags inside the flags payload', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString(routingConfig, {
        url: 'https://example.com/',
        flags: { theme: '</script><script>alert(1)</script>' },
      })

      expect(rendered.html).not.toContain('</script><script>alert(1)')
      expect(rendered.html).toContain('\\u003c/script>')
    }),
  )

  it.effect('renders from the encode-then-decode round trip of the flags', () =>
    Effect.gen(function* () {
      const TrimmedTheme = Schema.String.pipe(
        Schema.decodeTo(
          Schema.String,
          SchemaTransformation.transform({
            decode: raw => raw.trim(),
            encode: theme => theme,
          }),
        ),
      )
      const rendered = yield* renderToString(
        { ...routingConfig, Flags: Schema.Struct({ theme: TrimmedTheme }) },
        { url: 'https://example.com/', flags: { theme: '  dark  ' } },
      )

      expect(rendered.html).toContain(
        `<div class="dark" ${FOLDKIT_APP_ATTRIBUTE}="app"`,
      )
      expect(rendered.html).toContain('{"theme":"  dark  "}')
    }),
  )

  it.effect(
    'fails with FlagsEncodeError when the encoded flags cannot be decoded back',
    () =>
      Effect.gen(function* () {
        const PrefixedTheme = Schema.String.pipe(
          Schema.decodeTo(
            Schema.String,
            SchemaTransformation.transformOrFail({
              decode: raw =>
                raw.startsWith('theme:')
                  ? Effect.succeed(raw.slice('theme:'.length))
                  : Effect.fail(
                      new SchemaIssue.InvalidValue({
                        message: `Expected a theme: prefix, got ${raw}`,
                      }),
                    ),
              encode: theme => Effect.succeed(theme),
            }),
          ),
        )
        const error = yield* Effect.flip(
          renderToString(
            {
              ...routingConfig,
              Flags: Schema.Struct({ theme: PrefixedTheme }),
            },
            { url: 'https://example.com/', flags: { theme: 'dark' } },
          ),
        )

        expect(error).toMatchObject({ _tag: 'FlagsEncodeError' })
      }),
  )

  it.effect('renders a config without flags and emits no payload', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString(
        {
          init: (): Readonly<{
            model: Model
            commands?: ReadonlyArray<never>
            outMessage?: never
          }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
          view,
        },
        { runtimeId: 'root' },
      )

      expect(rendered.html).toContain(`${FOLDKIT_APP_ATTRIBUTE}="root"`)
      expect(rendered.html).not.toContain(FOLDKIT_FLAGS_ATTRIBUTE)
    }),
  )

  const configWithoutFlags = {
    init: (): Readonly<{
      model: Model
      commands?: ReadonlyArray<never>
      outMessage?: never
    }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
    view,
  }

  it('requires render options at the type boundary', () => {
    // Hydration compares the id on the served root with the client's own to
    // refuse a page from another deployment. A render that carries none has no
    // such protection, and nothing here could invent one that both builds of a
    // deployment would agree on. Since a render is hydratable by default, a
    // call with no options could only ever fail, so the compiler rejects it
    // rather than the Effect.
    if (false) {
      // @ts-expect-error a render must say which deployment it belongs to
      renderToStringWithOptions(configWithoutFlags)
      renderToStringWithOptions(configWithoutFlags, { buildId: 'build-one' })
      renderToStringWithOptions(configWithoutFlags, { isHydratable: false })
      // @ts-expect-error static output has no deployment to name
      renderToStringWithOptions(configWithoutFlags, {
        isHydratable: false,
        buildId: 'build-one',
      })
    }

    expect(typeof renderToStringWithOptions).toBe('function')
  })

  it.effect(
    'fails when a hydratable render is given an undefined build id',
    () =>
      Effect.gen(function* () {
        // A JavaScript caller, or a client compiled before the option existed,
        // reaches the runtime check rather than the compiler.
        const error = yield* Effect.flip(
          renderToStringUnchecked(configWithoutFlags, { buildId: undefined }),
        )

        expect(error).toMatchObject({ _tag: 'MissingBuildId' })
      }),
  )

  it.effect('fails when the build id is empty', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        renderToStringUnchecked(configWithoutFlags, { buildId: '' }),
      )

      expect(error).toMatchObject({ _tag: 'MissingBuildId' })
    }),
  )

  it.effect('fails when the build id is not a string', () =>
    Effect.gen(function* () {
      for (const buildId of [null, 0, false, {}]) {
        const error = yield* Effect.flip(
          renderToStringUnchecked(configWithoutFlags, { buildId }),
        )

        expect(error).toMatchObject({ _tag: 'MissingBuildId' })
      }
    }),
  )

  it.effect('renders without a build id when nothing will hydrate', () =>
    Effect.gen(function* () {
      // Static output carries no hydration contract, so there is nothing for a
      // build id to protect.
      const rendered = yield* renderToStringWithOptions(
        {
          init: (): Readonly<{
            model: Model
            commands?: ReadonlyArray<never>
            outMessage?: never
          }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
          view,
        },
        { isHydratable: false },
      )

      expect(rendered.html).not.toContain('data-foldkit-build')
      expect(rendered.html).not.toContain(FOLDKIT_APP_ATTRIBUTE)
    }),
  )

  it.effect('stamps the build id on a hydratable root', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToStringWithOptions(
        {
          init: (): Readonly<{
            model: Model
            commands?: ReadonlyArray<never>
            outMessage?: never
          }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
          view,
        },
        { buildId: 'release-2026-08-17' },
      )

      expect(rendered.html).toContain('data-foldkit-build="release-2026-08-17"')
    }),
  )

  it.effect('fails with InvalidRuntimeId for an empty runtimeId', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        renderToString(
          {
            init: (): Readonly<{
              model: Model
              commands?: ReadonlyArray<never>
              outMessage?: never
            }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
            view,
          },
          { runtimeId: '' },
        ),
      )

      expect(error).toMatchObject({
        _tag: 'InvalidRuntimeId',
        runtimeId: '',
      })
    }),
  )

  it.effect('fails with InvalidUrl for an unparseable url', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        renderToString(routingConfig, {
          url: 'not a url',
          flags: { theme: 'dark' },
        }),
      )

      expect(error).toMatchObject({
        _tag: 'InvalidUrl',
        url: 'not a url',
      })
    }),
  )

  it.effect('rejects text and comment hydration roots', () =>
    Effect.gen(function* () {
      const roots: ReadonlyArray<
        Readonly<{ body: VNode; rootKind: 'Text' | 'Comment' }>
      > = [
        {
          body: {
            sel: undefined,
            data: undefined,
            children: undefined,
            elm: undefined,
            text: 'text',
            key: undefined,
          },
          rootKind: 'Text',
        },
        {
          body: {
            sel: '!',
            data: {},
            children: undefined,
            elm: undefined,
            text: 'comment',
            key: undefined,
          },
          rootKind: 'Comment',
        },
      ]

      for (const { body, rootKind } of roots) {
        const error = yield* Effect.flip(
          renderToString({
            init: (): Readonly<{
              model: Model
              commands?: ReadonlyArray<never>
              outMessage?: never
            }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
            view: () => ({ title: rootKind, body }),
          }),
        )

        expect(error).toMatchObject({
          _tag: 'InvalidHydrationRoot',
          rootKind,
        })
      }
    }),
  )

  it.effect('fails when a hydratable view has no element root', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        renderToString({
          init: (): Readonly<{
            model: Model
            commands?: ReadonlyArray<never>
            outMessage?: never
          }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
          view: () => ({ title: 'Empty', body: null }),
        }),
      )

      expect(error).toMatchObject({
        _tag: 'InvalidHydrationRoot',
        rootKind: 'Empty',
      })
    }),
  )

  it.effect('reports unsafe serialized markup as a typed failure', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        renderToString({
          init: (): Readonly<{
            model: Model
            commands?: ReadonlyArray<never>
            outMessage?: never
          }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
          view: () => ({
            title: 'Unsafe',
            body: h.script([], ['</script><script>alert(1)</script>']),
          }),
        }),
      )

      expect(error).toMatchObject({ _tag: 'SerializationError' })
    }),
  )

  // Fragments that leave an element open past the root's own close tag, so the
  // parser reads the Flags payload, the client entry, and the document tail as
  // that element's content.
  const UNTERMINATED_FRAGMENTS = [
    '<textarea>',
    '<style>',
    '<!--',
    '<plaintext>',
    '<iframe>',
  ]

  const failsHydratableRender = (body: Document['body']) =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        renderToString({
          init: (): Readonly<{
            model: Model
            commands?: ReadonlyArray<never>
            outMessage?: never
          }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
          view: () => ({ title: 'Escapes', body }),
        }),
      )

      expect(error).toMatchObject({ _tag: 'SerializationError' })
    })

  const rendersHydratable = (body: Document['body'], contains: string) =>
    Effect.gen(function* () {
      const rendered = yield* renderToString({
        init: (): Readonly<{
          model: Model
          commands?: ReadonlyArray<never>
          outMessage?: never
        }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
        view: () => ({ title: 'Renders', body }),
      })

      expect(rendered.html).toContain(contains)
    })

  it.effect(
    'rejects a block element inside a <p> that parsing splits out',
    () =>
      failsHydratableRender(
        h.p([], [h.div([], ['inside']), h.span([], ['after'])]),
      ),
  )

  it.effect(
    'rejects a stray element inside a <table> parsing fosters out',
    () =>
      failsHydratableRender(
        h.table([], [h.div([], ['inside']), h.tr([], [h.td([], ['cell'])])]),
      ),
  )

  it.effect('rejects an HTML element inside an <svg> that breaks out', () =>
    failsHydratableRender(
      h.svg([], [h.div([h.Id('escaped')], ['inside']), h.circle([])]),
    ),
  )

  it.effect('rejects foreign InnerHTML that escapes the <svg> namespace', () =>
    failsHydratableRender(h.svg([h.InnerHTML('<strike>escaped</strike>')])),
  )

  it.effect(
    'rejects a bare <tr> that parsing wraps in an implicit <tbody>',
    () => failsHydratableRender(h.table([], [h.tr([], [h.td([], ['cell'])])])),
  )

  it.effect('rejects text a <table> foster-parents out of its structure', () =>
    failsHydratableRender(
      h.div(
        [],
        [
          h.table(
            [],
            [h.tbody([], [h.tr([], [h.td([], ['cell'])]), 'stray text'])],
          ),
        ],
      ),
    ),
  )

  it.effect('renders an element whose only text child is empty', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString({
        init: (): Readonly<{
          model: Model
          commands?: ReadonlyArray<never>
          outMessage?: never
        }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
        view: () => ({
          title: 'Empty text',
          body: h.div([], [h.span([], ['']), h.span([], ['', 'kept', ''])]),
        }),
      })

      expect(rendered.html).toContain('<span></span><span>kept</span>')
    }),
  )

  it.effect('renders a table with an explicit tbody unchanged', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString({
        init: (): Readonly<{
          model: Model
          commands?: ReadonlyArray<never>
          outMessage?: never
        }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
        view: () => ({
          title: 'Table',
          body: h.table([], [h.tbody([], [h.tr([], [h.td([], ['cell'])])])]),
        }),
      })

      expect(rendered.html).toContain('<tbody><tr><td>cell</td></tr></tbody>')
    }),
  )

  it.effect('renders a standalone empty text child', () =>
    rendersHydratable(h.div([], ['']), `<div ${FOLDKIT_APP_ATTRIBUTE}="app"`),
  )

  it.effect('renders empty text before and after an element', () =>
    rendersHydratable(h.div([], ['', h.span([], ['x']), '']), '<span>x</span>'),
  )

  it.effect('renders consecutive empty and non-empty text', () =>
    rendersHydratable(h.div([], ['', 'kept', '']), '>kept</div>'),
  )

  it.effect('renders a controlled textarea value as its text content', () =>
    rendersHydratable(h.textarea([h.Value('model')]), '>model</textarea>'),
  )

  it.effect('renders an uncontrolled textarea with text children', () =>
    rendersHydratable(h.textarea([], ['hello']), '>hello</textarea>'),
  )

  it.effect(
    'rejects a textarea with element children parsing folds to text',
    () => failsHydratableRender(h.textarea([], [h.b([], ['x'])])),
  )

  it.effect(
    'pads a <pre> whose empty text precedes newline-prefixed text',
    () => rendersHydratable(h.pre([], ['', '\nfirst']), '\n\nfirst</pre>'),
  )

  it.effect(
    'pads an uncontrolled <textarea> with empty then newline-prefixed text',
    () =>
      rendersHydratable(
        h.textarea([], ['', '\nfirst']),
        '\n\nfirst</textarea>',
      ),
  )

  it.effect(
    'pads a <pre> with multiple empty text runs before the newline',
    () => rendersHydratable(h.pre([], ['', '', '\nfirst']), '\n\nfirst</pre>'),
  )

  it.effect('does not pad a <pre> whose first emitted node is an element', () =>
    rendersHydratable(
      h.pre([], [h.span([], ['x']), '\nfirst']),
      '><span>x</span>\nfirst</pre>',
    ),
  )

  it.effect('renders a valid svg root that parses back to one element', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString({
        init: (): Readonly<{
          model: Model
          commands?: ReadonlyArray<never>
          outMessage?: never
        }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
        view: () => ({
          title: 'Svg',
          body: h.svg([], [h.circle([])]),
        }),
      })

      expect(rendered.html).toContain(`<svg ${FOLDKIT_APP_ATTRIBUTE}="app"`)
      expect(rendered.html).toContain('<circle></circle>')
    }),
  )

  it.effect('keeps a canonical mixed-case SVG tag', () =>
    rendersHydratable(
      h.svg([], [h.linearGradient([])]),
      '<linearGradient></linearGradient>',
    ),
  )

  it.effect('rejects noncanonical SVG tag spelling', () =>
    Effect.gen(function* () {
      for (const body of [
        h.svg([], [customElement<never>()('RECT')([])]),
        h.svg([], [customElement<never>()('lineargradient')([])]),
      ]) {
        const error = yield* Effect.flip(
          renderToString({
            init: (): Readonly<{
              model: Model
              commands?: ReadonlyArray<never>
              outMessage?: never
            }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
            view: () => ({ title: 'SVG case', body }),
          }),
        )

        expect(error).toMatchObject({ _tag: 'SerializationError' })
        expect(String(error.cause)).toContain('canonical tag spelling')
      }
    }),
  )

  it.effect('rejects noncanonical spelling on a foreign root', () =>
    Effect.gen(function* () {
      const body: VNode = {
        sel: 'SVG',
        data: { ns: 'http://www.w3.org/2000/svg' },
        children: [],
        elm: undefined,
        text: undefined,
        key: undefined,
      }
      const error = yield* Effect.flip(
        renderToString({
          init: (): Readonly<{
            model: Model
            commands?: ReadonlyArray<never>
            outMessage?: never
          }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
          view: () => ({ title: 'SVG root case', body }),
        }),
      )

      expect(error).toMatchObject({ _tag: 'SerializationError' })
      expect(String(error.cause)).toContain('canonical tag spelling')
    }),
  )

  it.effect('renders a math root with MathML-namespaced descendants', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString({
        init: (): Readonly<{
          model: Model
          commands?: ReadonlyArray<never>
          outMessage?: never
        }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
        view: () => ({
          title: 'Math',
          body: h.math([], [h.mrow([], [h.mi([], ['x']), h.mo([], ['='])])]),
        }),
      })

      expect(rendered.html).toContain(`<math ${FOLDKIT_APP_ATTRIBUTE}="app"`)
      expect(rendered.html).toContain('<mrow><mi>x</mi><mo>=</mo></mrow>')
    }),
  )

  it.effect('rejects noncanonical MathML tag spelling', () =>
    Effect.gen(function* () {
      const body = h.math([], [customElement<never>()('MROW')([])])
      const error = yield* Effect.flip(
        renderToString({
          init: (): Readonly<{
            model: Model
            commands?: ReadonlyArray<never>
            outMessage?: never
          }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
          view: () => ({ title: 'MathML case', body }),
        }),
      )

      expect(error).toMatchObject({ _tag: 'SerializationError' })
      expect(String(error.cause)).toContain('canonical tag spelling')
    }),
  )

  it.effect('keeps mglyph in MathML inside a text integration point', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString({
        init: (): Readonly<{
          model: Model
          commands?: ReadonlyArray<never>
          outMessage?: never
        }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
        view: () => ({
          title: 'Math',
          body: h.math([], [h.mi([], [h.mglyph([])])]),
        }),
      })

      expect(rendered.html).toContain('<mi><mglyph></mglyph></mi>')
    }),
  )

  it.effect('treats annotation-xml with an HTML encoding as HTML content', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString({
        init: (): Readonly<{
          model: Model
          commands?: ReadonlyArray<never>
          outMessage?: never
        }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
        view: () => ({
          title: 'Math',
          body: h.math(
            [],
            [
              h['annotation-xml'](
                [h.Attribute('encoding', 'text/html')],
                [h.div([], ['x'])],
              ),
            ],
          ),
        }),
      })

      expect(rendered.html).toContain(
        '<annotation-xml encoding="text/html"><div>x</div></annotation-xml>',
      )
    }),
  )

  it.effect('matches the annotation-xml encoding case-insensitively', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString({
        init: (): Readonly<{
          model: Model
          commands?: ReadonlyArray<never>
          outMessage?: never
        }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
        view: () => ({
          title: 'Math',
          body: h.math(
            [],
            [
              h['annotation-xml'](
                [h.Attribute('ENCODING', 'TEXT/HTML')],
                [h.div([], ['x'])],
              ),
            ],
          ),
        }),
      })

      expect(rendered.html).toContain('<div>x</div></annotation-xml>')
    }),
  )

  it.effect('allows a non-element root for static, non-hydratable markup', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString(
        {
          init: (): Readonly<{
            model: Model
            commands?: ReadonlyArray<never>
            outMessage?: never
          }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
          view: () => ({ title: 'Empty', body: null }),
        },
        { isHydratable: false },
      )

      expect(rendered.html).toBe('<!---->')
      expect(rendered.title).toBe('Empty')
    }),
  )

  it.effect(
    'renders flags from the JSON-round-tripped value, not the in-memory encoded value',
    () =>
      Effect.gen(function* () {
        const RatioFlags = Schema.Struct({ ratio: Schema.Number })
        const RatioModel = Schema.Struct({ ratio: Schema.Number })
        type RatioModel = typeof RatioModel.Type
        const rendered = yield* renderToString(
          {
            Flags: RatioFlags,
            init: (flags: {
              ratio: number
            }): Readonly<{
              model: RatioModel
              commands?: ReadonlyArray<never>
              outMessage?: never
            }> => ({ model: RatioModel.make({ ratio: flags.ratio }) }),
            view: (model: RatioModel): Document => ({
              title: 'Ratio',
              body: h.div([], [String(1 / model.ratio)]),
            }),
          },
          { flags: { ratio: -0 } },
        )

        // -0 serializes to 0 in the payload JSON, so the hydrating client
        // reconstructs 0 and renders 1 / 0 = Infinity. The server must render
        // that same value, not 1 / -0 = -Infinity from the in-memory encode.
        expect(rendered.html).toContain('>Infinity</div>')
        expect(rendered.html).not.toContain('-Infinity')
      }),
  )

  it.effect(
    'fails when the flags codec decodes asynchronously, which the client cannot',
    () =>
      Effect.gen(function* () {
        const AsyncTheme = Schema.String.pipe(
          Schema.decodeTo(
            Schema.String,
            SchemaTransformation.transformOrFail({
              decode: raw => Effect.promise(() => Promise.resolve(raw)),
              encode: theme => Effect.succeed(theme),
            }),
          ),
        )
        const error = yield* Effect.flip(
          renderToString(
            { ...routingConfig, Flags: Schema.Struct({ theme: AsyncTheme }) },
            { url: 'https://example.com/', flags: { theme: 'dark' } },
          ),
        )

        expect(error).toMatchObject({ _tag: 'FlagsEncodeError' })
      }),
  )

  it.effect(
    'defaults canonical and ogUrl to the request url for a routing render',
    () =>
      Effect.gen(function* () {
        const plainView = (model: Model): Document => ({
          title: `Page ${model.pathname}`,
          body: h.div([], [h.h1([], [model.pathname])]),
        })
        const rendered = yield* renderToString(
          { ...routingConfig, view: plainView },
          {
            url: 'https://example.com/deep/link?q=1',
            flags: { theme: 'dark' },
          },
        )

        expect(rendered.canonical).toBe('https://example.com/deep/link?q=1')
        expect(rendered.ogUrl).toBe('https://example.com/deep/link?q=1')
      }),
  )

  it.effect('defaults ogUrl to an explicitly set canonical', () =>
    Effect.gen(function* () {
      const canonicalView = (model: Model): Document => ({
        title: `Page ${model.pathname}`,
        canonical: 'https://example.com/canonical',
        body: h.div([], [h.h1([], [model.pathname])]),
      })
      const rendered = yield* renderToString(
        { ...routingConfig, view: canonicalView },
        { url: 'https://example.com/other', flags: { theme: 'dark' } },
      )

      expect(rendered.canonical).toBe('https://example.com/canonical')
      expect(rendered.ogUrl).toBe('https://example.com/canonical')
    }),
  )

  it.effect(
    'does not default canonical or ogUrl for a non-routing render',
    () =>
      Effect.gen(function* () {
        const rendered = yield* renderToString({
          init: (): Readonly<{
            model: Model
            commands?: ReadonlyArray<never>
            outMessage?: never
          }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
          view: () => ({ title: 'No url', body: h.div([], ['x']) }),
        })

        expect(rendered.canonical).toBeUndefined()
        expect(rendered.ogUrl).toBeUndefined()
      }),
  )

  it.effect(
    'normalizes the default canonical to match the client location',
    () =>
      Effect.gen(function* () {
        const plainView = (model: Model): Document => ({
          title: `Page ${model.pathname}`,
          body: h.div([], [h.h1([], [model.pathname])]),
        })
        const rendered = yield* renderToString(
          { ...routingConfig, view: plainView },
          {
            url: 'https://EXAMPLE.com:443/a?q=1#frag',
            flags: { theme: 'dark' },
          },
        )

        // origin lowercases the host and drops the default port, and a canonical
        // URL carries no fragment, matching the client's currentLocationUrl.
        expect(rendered.canonical).toBe('https://example.com/a?q=1')
        expect(rendered.ogUrl).toBe('https://example.com/a?q=1')
      }),
  )

  it('accepts an explicitly annotated runtime application config', () => {
    // Compile-time check: a full runtime application config is structurally
    // assignable to the server render input, as the renderToString TSDoc
    // promises. The function is never invoked; were the assignment not to hold,
    // this file would not compile.
    const acceptsRuntimeConfig = (
      config: RoutingApplicationConfigWithFlags<Model, never, Flags>,
    ) =>
      renderToString(config, {
        url: 'https://example.com/',
        flags: { theme: 'dark' },
      })
    expect(typeof acceptsRuntimeConfig).toBe('function')
  })

  it.effect(
    'renders a controlled output value as text, not an inert attribute',
    () =>
      Effect.gen(function* () {
        const rendered = yield* renderToString({
          init: (): Readonly<{
            model: Model
            commands?: ReadonlyArray<never>
            outMessage?: never
          }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
          view: () => ({ title: 'Output', body: h.output([h.Value('42')]) }),
        })

        expect(rendered.html).toContain('>42</output>')
        expect(rendered.html).not.toContain('value="42"')
      }),
  )

  it.effect(
    'marks only the first option matching a duplicated select value',
    () =>
      Effect.gen(function* () {
        const rendered = yield* renderToString({
          init: (): Readonly<{
            model: Model
            commands?: ReadonlyArray<never>
            outMessage?: never
          }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
          view: () => ({
            title: 'Select',
            body: h.select(
              [h.Value('x')],
              [
                h.option([h.Value('x')], ['First']),
                h.option([h.Value('x')], ['Second']),
              ],
            ),
          }),
        })

        expect(rendered.html).toContain(
          '<option value="x" selected="">First</option>',
        )
        expect(rendered.html).toContain('<option value="x">Second</option>')
      }),
  )

  it.effect(
    'rejects a non-breaking space a table foster-parents before the root',
    () =>
      failsHydratableRender(
        h.table([], ['\u00a0', h.tbody([], [h.tr([], [h.td([], ['cell'])])])]),
      ),
  )

  it.effect('rejects a table-cell root an in-body parse drops', () =>
    failsHydratableRender(h.td([h.Class('cell')], ['hello'])),
  )

  it.effect('rejects a bare table-row root the browser foster-parents', () =>
    failsHydratableRender(h.tr([], [h.td([], ['cell'])])),
  )

  it.effect('renders a noscript whose only content is plain text', () =>
    rendersHydratable(
      h.noscript([], ['Enable JavaScript.']),
      '>Enable JavaScript.</noscript>',
    ),
  )

  it.effect('round-trips noscript text containing markup characters', () =>
    rendersHydratable(
      h.noscript([], ['Tom & Jerry <3']),
      '>Tom & Jerry <3</noscript>',
    ),
  )

  it.effect(
    'rejects a noscript wrapping elements with a noscript-specific error',
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(
          renderToString({
            init: (): Readonly<{
              model: Model
              commands?: ReadonlyArray<never>
              outMessage?: never
            }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
            view: () => ({
              title: 'Noscript',
              body: h.noscript([], [h.p([], ['Enable JavaScript.'])]),
            }),
          }),
        )

        expect(error).toMatchObject({ _tag: 'SerializationError' })
        if (error._tag === 'SerializationError') {
          expect(String(error.cause)).toContain('noscript')
        }
      }),
  )

  it.effect('rejects a template with element children', () =>
    failsHydratableRender(h.template([], [h.p([], ['x'])])),
  )

  it.effect(
    'rejects an InnerHTML fragment that would swallow the rest of the document',
    () =>
      Effect.gen(function* () {
        for (const fragment of UNTERMINATED_FRAGMENTS) {
          const error = yield* Effect.flip(
            renderToString({
              init: (): Readonly<{
                model: Model
                commands?: ReadonlyArray<never>
                outMessage?: never
              }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
              view: () => ({
                title: 'Fragment',
                body: h.div([h.InnerHTML(fragment)]),
              }),
            }),
          )

          expect(error).toMatchObject({ _tag: 'SerializationError' })
          if (error._tag === 'SerializationError') {
            expect(String(error.cause)).toContain('does not close cleanly')
          }
        }
      }),
  )

  it.effect(
    'rejects an unterminated InnerHTML fragment in a render that is not hydratable',
    () =>
      Effect.gen(function* () {
        // Static markup is placed into a document the same way a hydratable
        // render is, so a root that does not close cleanly swallows whatever the
        // host writes after it whether or not a client will hydrate it.
        for (const fragment of UNTERMINATED_FRAGMENTS) {
          const error = yield* Effect.flip(
            renderToString(
              {
                init: (): Readonly<{
                  model: Model
                  commands?: ReadonlyArray<never>
                  outMessage?: never
                }> => ({
                  model: Model.make({ theme: 'plain', pathname: '/' }),
                }),
                view: () => ({
                  title: 'Fragment',
                  body: h.div([h.InnerHTML(fragment)]),
                }),
              },
              { isHydratable: false },
            ),
          )

          expect(error).toMatchObject({ _tag: 'SerializationError' })
          if (error._tag === 'SerializationError') {
            expect(String(error.cause)).toContain('does not close cleanly')
          }
        }
      }),
  )

  it.effect('validates the parsed shape of a static render too', () =>
    Effect.gen(function* () {
      // Nothing will hydrate this markup, which is the reason to check it
      // rather than to skip it: hydration is what would otherwise rebuild a
      // reshaped subtree, so here a moved or dropped node is simply lost.
      const reshaped: ReadonlyArray<readonly [string, Html]> = [
        // A <p> cannot contain a <div>: the parser closes the paragraph, emits
        // the div as a sibling, and opens an empty one after it.
        ['p holding a div', h.p([], [h.div([], ['x'])])],
        // The same correction one level down, below a root that survives.
        ['div > p > div', h.div([], [h.p([], [h.div([], ['x'])])])],
        // A browser inserts the <tbody> a bare <tr> needs.
        ['table holding a bare tr', h.table([], [h.tr([], [h.td([], ['c'])])])],
        // Text directly inside a table is foster-parented out in front of it.
        ['text directly inside a table', h.table([], ['stray'])],
      ]

      for (const [label, body] of reshaped) {
        const error = yield* Effect.flip(
          renderToString(
            {
              init: (): Readonly<{
                model: Model
                commands?: ReadonlyArray<never>
                outMessage?: never
              }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
              view: () => ({ title: 'Static', body }),
            },
            { isHydratable: false },
          ),
        )

        expect(error, label).toMatchObject({ _tag: 'SerializationError' })
      }
    }),
  )

  it.effect('accepts a structurally valid static render', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString(
        {
          init: (): Readonly<{
            model: Model
            commands?: ReadonlyArray<never>
            outMessage?: never
          }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
          view: () => ({
            title: 'Static',
            body: h.table([], [h.tbody([], [h.tr([], [h.td([], ['c'])])])]),
          }),
        },
        { isHydratable: false },
      )

      expect(rendered.html).toContain('<tbody><tr><td>c</td></tr></tbody>')
      expect(rendered.html).not.toContain(FOLDKIT_APP_ATTRIBUTE)
    }),
  )

  it.effect('rejects InnerHTML that mutates the document around it', () =>
    Effect.gen(function* () {
      // InnerHTML is trusted to carry markup, not to reach outside the
      // application. A browser merges an <html> or <body> tag's attributes onto
      // the page's own elements and hoists its content, so the fragment ends up
      // changing a document the application does not own. A fragment parse
      // drops those tags, which is why this is checked against a whole page.
      for (const fragment of [
        '<html data-inner-html="yes"><body data-inner-body="yes"><p id="inside">Inside</p></body></html>',
        '<body onload="x"></body>',
        '<html lang="zz"></html>',
        '<noscript><body data-inner-body="yes"></body></noscript>',
      ]) {
        const error = yield* Effect.flip(
          renderToString({
            init: (): Readonly<{
              model: Model
              commands?: ReadonlyArray<never>
              outMessage?: never
            }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
            view: () => ({
              title: 'Escape',
              body: h.div([h.Id('app'), h.InnerHTML(fragment)]),
            }),
          }),
        )

        expect(error, fragment).toMatchObject({ _tag: 'SerializationError' })
        if (error._tag === 'SerializationError') {
          expect(String(error.cause)).toContain(
            'changes the document it is placed into',
          )
        }
      }
    }),
  )

  it.effect('rejects a document escape in a static render too', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        renderToString(
          {
            init: (): Readonly<{
              model: Model
              commands?: ReadonlyArray<never>
              outMessage?: never
            }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
            view: () => ({
              title: 'Escape',
              body: h.div([h.InnerHTML('<body data-inner-body="yes"></body>')]),
            }),
          },
          { isHydratable: false },
        ),
      )

      expect(error).toMatchObject({ _tag: 'SerializationError' })
    }),
  )

  it.effect('accepts ordinary InnerHTML markup', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString({
        init: (): Readonly<{
          model: Model
          commands?: ReadonlyArray<never>
          outMessage?: never
        }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
        view: () => ({
          title: 'Fragment',
          body: h.div([
            h.InnerHTML('<p><strong>bold</strong> and <em>italic</em></p>'),
          ]),
        }),
      })

      expect(rendered.html).toContain('<strong>bold</strong>')
    }),
  )

  it.effect('rejects script elements created through InnerHTML', () =>
    Effect.gen(function* () {
      for (const options of [
        { buildId: BUILD_ID },
        { isHydratable: false as const },
      ]) {
        for (const fragment of [
          '<script>globalThis.executed = true</script>',
          '<script type="module">globalThis.executed = true</script>',
          '<script type="importmap">{"imports":{}}</script>',
          '<script type="application/json">{"data":true}</script>',
          '<template><script>globalThis.executed = true</script></template>',
          '<noscript><script>globalThis.executed = true</script></noscript>',
          '<svg><script>globalThis.executed = true</script></svg>',
        ]) {
          const error = yield* Effect.flip(
            renderToStringWithOptions(
              {
                init: (): Readonly<{
                  model: Model
                  commands?: ReadonlyArray<never>
                  outMessage?: never
                }> => ({
                  model: Model.make({ theme: 'plain', pathname: '/' }),
                }),
                view: () => ({
                  title: 'Script boundary',
                  body: h.div([h.InnerHTML(fragment)]),
                }),
              },
              options,
            ),
          )

          expect(error, fragment).toMatchObject({ _tag: 'SerializationError' })
          if (error._tag === 'SerializationError') {
            expect(String(error.cause)).toContain('contains a <script> element')
          }
        }
      }
    }),
  )

  it.effect(
    'rejects a live HTML base element before it can redirect startup',
    () =>
      Effect.gen(function* () {
        for (const options of [
          { buildId: BUILD_ID },
          { isHydratable: false as const },
        ]) {
          for (const body of [
            h.div([], [h.base([h.Href('https://evil.example/base/')])]),
            h.div([h.InnerHTML('<base href="https://evil.example/base/">')]),
            h.div([
              h.InnerHTML(
                '<noscript><base href="https://evil.example/base/"></noscript>',
              ),
            ]),
          ]) {
            const error = yield* Effect.flip(
              renderToStringWithOptions(
                {
                  init: (): Readonly<{
                    model: Model
                    commands?: ReadonlyArray<never>
                    outMessage?: never
                  }> => ({
                    model: Model.make({ theme: 'plain', pathname: '/' }),
                  }),
                  view: () => ({ title: 'Base boundary', body }),
                },
                options,
              ),
            )

            expect(error).toMatchObject({ _tag: 'SerializationError' })
            if (error._tag === 'SerializationError') {
              expect(String(error.cause)).toContain(
                'contains a live HTML <base> element',
              )
            }
          }
        }
      }),
  )

  it.effect('accepts a base element inside an inert ordinary template', () =>
    rendersHydratable(
      h.div([
        h.InnerHTML(
          '<template><base href="https://example.com/inert/"></template>',
        ),
      ]),
      '<template><base href="https://example.com/inert/"></template>',
    ),
  )

  it.effect('rejects InnerHTML changed by an ancestor form parser state', () =>
    Effect.gen(function* () {
      for (const options of [
        { buildId: BUILD_ID },
        { isHydratable: false as const },
      ]) {
        const error = yield* Effect.flip(
          renderToStringWithOptions(
            {
              init: (): Readonly<{
                model: Model
                commands?: ReadonlyArray<never>
                outMessage?: never
              }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
              view: () => ({
                title: 'Nested form',
                body: h.form(
                  [],
                  [
                    h.div([
                      h.InnerHTML(
                        '<form id="inner"><input id="x"></form><p id="tail">t</p>',
                      ),
                    ]),
                  ],
                ),
              }),
            },
            options,
          ),
        )

        expect(error).toMatchObject({ _tag: 'SerializationError' })
        if (error._tag === 'SerializationError') {
          expect(String(error.cause)).toContain(
            'parses differently when assigned to a fresh element',
          )
        }
      }
    }),
  )

  it.effect('rejects rendered markup that declares a shadow root', () =>
    Effect.gen(function* () {
      // A browser turns a declarative shadow root into a real one while
      // parsing, moving its content out of the light DOM. `injectIntoTemplate`
      // is not the only way markup reaches a page, so this is refused where
      // every render passes: the nested and scripting-disabled forms reach a
      // browser's parser exactly as the direct one does.
      for (const fragment of [
        '<template shadowrootmode="open"><span>s</span></template>',
        '<template shadowroot="open"><span>s</span></template>',
        '<template><template shadowrootmode="open"><span>s</span></template></template>',
        '<noscript><template shadowrootmode="open"><span>s</span></template></noscript>',
      ]) {
        const error = yield* Effect.flip(
          renderToString({
            init: (): Readonly<{
              model: Model
              commands?: ReadonlyArray<never>
              outMessage?: never
            }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
            view: () => ({
              title: 'Shadow',
              body: h.div([h.InnerHTML(fragment)]),
            }),
          }),
        )

        expect(error).toMatchObject({ _tag: 'SerializationError' })
        if (error._tag === 'SerializationError') {
          expect(String(error.cause)).toContain('declares a shadow root')
        }
      }
    }),
  )

  it.effect('scans a deeply nested tree without doubling per level', () =>
    Effect.gen(function* () {
      // The shadow-root scan used to descend into both an element and the
      // content fragment that, for an ordinary element, is that same element,
      // doubling the work at every level. The serializer accepts a depth of
      // 1000, so a request-driven nested view could hold the event loop; the
      // doubled scan took most of a second at depth 24 alone.
      //
      // The bound below is absolute rather than a ratio: one visit per node
      // renders this in well under a millisecond, so half a second leaves room
      // for a slow machine while still failing every doubling implementation.
      const nested = (depth: number): Html =>
        depth === 0 ? h.span([], ['leaf']) : h.div([], [nested(depth - 1)])

      const renderAtDepth = (depth: number) =>
        renderToString({
          init: (): Readonly<{
            model: Model
            commands?: ReadonlyArray<never>
            outMessage?: never
          }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
          view: () => ({ title: 'Nested', body: nested(depth) }),
        })

      // Warm the parser so its start-up cost does not land on the measurement.
      yield* renderAtDepth(8)

      const start = performance.now()
      yield* renderAtDepth(24)
      const elapsedMs = performance.now() - start

      expect(elapsedMs).toBeLessThan(500)
    }),
  )

  it.effect('accepts an ordinary template in rendered markup', () =>
    Effect.gen(function* () {
      const result = yield* renderToString({
        init: (): Readonly<{
          model: Model
          commands?: ReadonlyArray<never>
          outMessage?: never
        }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
        view: () => ({
          title: 'Template',
          body: h.div([h.InnerHTML('<template><span>s</span></template>')]),
        }),
      })

      expect(result.html).toContain('<template><span>s</span></template>')
    }),
  )

  it.effect('rejects a view rooted at a document structure element', () =>
    Effect.gen(function* () {
      // A browser builds <html>, <head>, <body>, and <frameset> from the
      // document it parses rather than from markup spliced into one, so a root
      // with one of those tags never survives to the served page: the start tag
      // is dropped and its children hoisted, or its attributes are merged onto
      // an element the view does not own.
      for (const root of [
        h.body([], [h.p([], ['x'])]),
        h.head([], [h.title([], ['x'])]),
        h.html([], [h.p([], ['x'])]),
        customElement<never>()('frameset')([]),
      ]) {
        const error = yield* Effect.flip(
          renderToString({
            init: (): Readonly<{
              model: Model
              commands?: ReadonlyArray<never>
              outMessage?: never
            }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
            view: () => ({ title: 'Structure', body: root }),
          }),
        )

        expect(error).toMatchObject({ _tag: 'SerializationError' })
        if (error._tag === 'SerializationError') {
          expect(String(error.cause)).toContain(
            'names the structure of a document',
          )
        }
      }
    }),
  )

  it.effect(
    'rejects a document structure root in a render that is not hydratable',
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(
          renderToString(
            {
              init: (): Readonly<{
                model: Model
                commands?: ReadonlyArray<never>
                outMessage?: never
              }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
              view: () => ({
                title: 'Structure',
                body: h.body([], [h.p([], ['x'])]),
              }),
            },
            { isHydratable: false },
          ),
        )

        expect(error).toMatchObject({ _tag: 'SerializationError' })
        if (error._tag === 'SerializationError') {
          expect(String(error.cause)).toContain(
            'names the structure of a document',
          )
        }
      }),
  )

  it.effect(
    'rejects noscript fallback markup that a browser with scripting disabled would not close',
    () =>
      Effect.gen(function* () {
        // With scripting enabled the noscript content is raw text and frames
        // cleanly, so only a scripting-disabled parse catches these. An unclosed
        // raw-text element or comment runs past the root and swallows the Flags
        // payload, the client entry, and the document tail; an unclosed form or
        // table stops at the root but pulls the markup after the noscript inside
        // itself. Both erase the page for exactly the visitors noscript serves.
        for (const fragment of [
          '<textarea>',
          '<style>',
          '<!--',
          '<plaintext>',
          '<form>',
          '<table><tr><td>cell',
        ]) {
          const error = yield* Effect.flip(
            renderToString({
              init: (): Readonly<{
                model: Model
                commands?: ReadonlyArray<never>
                outMessage?: never
              }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
              view: () => ({
                title: 'Noscript',
                body: h.div(
                  [],
                  [h.noscript([h.InnerHTML(fragment)]), h.p([], ['After'])],
                ),
              }),
            }),
          )

          expect(error).toMatchObject({ _tag: 'SerializationError' })
        }
      }),
  )

  it.effect(
    'rejects a noscript inside an InnerHTML fragment that reparents what follows it',
    () =>
      Effect.gen(function* () {
        // The noscript arrives inside opaque InnerHTML markup, so no walk over
        // the view's own children can see it. With scripting enabled the
        // paragraph is a sibling after the noscript; with scripting disabled
        // the open form pulls it inside, and the root still closes cleanly.
        for (const fragment of [
          '<noscript><form></noscript><p id="after">After</p>',
          '<noscript><table><tr><td>cell</noscript><p id="after">After</p>',
          '<noscript><select><option>one</noscript><p id="after">After</p>',
        ]) {
          const error = yield* Effect.flip(
            renderToString({
              init: (): Readonly<{
                model: Model
                commands?: ReadonlyArray<never>
                outMessage?: never
              }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
              view: () => ({
                title: 'Nested',
                body: h.div([h.InnerHTML(fragment)]),
              }),
            }),
          )

          expect(error).toMatchObject({ _tag: 'SerializationError' })
        }
      }),
  )

  it.effect(
    'rejects a noscript nested below foreign content that reparents what follows it',
    () =>
      Effect.gen(function* () {
        // The outer <noscript> is in the SVG namespace, where the name means
        // nothing to the parser, so skipping it as a noscript would leave the
        // real HTML one inside the <foreignObject> integration point
        // unexamined. With scripting disabled the inner fallback's textarea
        // swallows the paragraph that follows it.
        const error = yield* Effect.flip(
          renderToString({
            init: (): Readonly<{
              model: Model
              commands?: ReadonlyArray<never>
              outMessage?: never
            }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
            view: () => ({
              title: 'Foreign',
              body: h.div([
                h.InnerHTML(
                  '<svg><noscript><foreignObject><noscript><textarea id="f">' +
                    '</noscript><p id="after">After</p></textarea>' +
                    '</foreignObject></noscript></svg>',
                ),
              ]),
            }),
          }),
        )

        expect(error).toMatchObject({ _tag: 'SerializationError' })
      }),
  )

  it.effect(
    'rejects a noscript inside template content that reparents what follows it',
    () =>
      Effect.gen(function* () {
        // A template holds its children in a separate content fragment rather
        // than in childNodes, so a walk over childNodes alone never sees this.
        // Declarative shadow DOM puts that content in the page.
        for (const fragment of [
          '<template><noscript><form></noscript><p id="after">After</p></template>',
          '<template shadowrootmode="open"><noscript><table><tr><td>cell</noscript><p id="after">After</p></template>',
        ]) {
          const error = yield* Effect.flip(
            renderToString({
              init: (): Readonly<{
                model: Model
                commands?: ReadonlyArray<never>
                outMessage?: never
              }> => ({ model: Model.make({ theme: 'plain', pathname: '/' }) }),
              view: () => ({
                title: 'Template',
                body: h.div([h.InnerHTML(fragment)]),
              }),
            }),
          )

          expect(error).toMatchObject({ _tag: 'SerializationError' })
        }
      }),
  )

  it.effect(
    'renders a noscript inside an InnerHTML fragment that closes its own markup',
    () =>
      rendersHydratable(
        h.div([
          h.InnerHTML(
            '<noscript><p>Enable JavaScript.</p></noscript><p id="after">After</p>',
          ),
        ]),
        '<noscript><p>Enable JavaScript.</p></noscript><p id="after">After</p>',
      ),
  )

  it.effect('renders complete noscript fallback markup', () =>
    rendersHydratable(
      h.noscript([h.InnerHTML('<p>Enable JavaScript to continue.</p>')]),
      '<p>Enable JavaScript to continue.</p></noscript>',
    ),
  )
})
