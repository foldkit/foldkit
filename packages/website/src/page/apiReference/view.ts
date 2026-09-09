import { clsx } from 'clsx'
import { Array, Option, Record, Result, pipe } from 'effect'
import { Submodel } from 'foldkit'
import {
  Html,
  type HtmlBuilder,
  createKeyedLazy,
  inertHtml as ih,
} from 'foldkit/html'

import { Disclosure } from '@foldkit/ui'

import { Icon } from '../../icon'
import {
  type RenderHeadingLink,
  headingWithContent,
  pageTitle,
} from '../../prose'
import {
  type ApiFunction,
  type ApiInterface,
  type ApiModule,
  type ApiParameter,
  type ApiType,
  type ApiVariable,
  scopedId,
  sectionId,
} from './domain'
import { Message } from './message'
import type { ApiData, Model } from './model'

type Highlights = ApiData['highlights']

const sourceLink = (
  sourceUrl: Option.Option<string>,
  name: string,
): ReadonlyArray<Html> =>
  Option.match(sourceUrl, {
    onNone: () => [],
    onSome: url => [
      ih.a(
        [
          ih.Class(
            'text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
          ),
          ih.AriaLabel(`View source for ${name}`),
          ih.Href(url),
        ],
        ['source'],
      ),
    ],
  })

const lazyItem = createKeyedLazy()

const functionView = (
  moduleName: string,
  apiFunction: ApiFunction,
  isSignatureDisclosureOpen: boolean | undefined,
  highlights: Highlights,
  renderHeadingLink: RenderHeadingLink,
  h: HtmlBuilder<Message>,
): Html => {
  const id = scopedId('function', moduleName, apiFunction.name)

  return h.div(
    [h.Class('mb-8')],
    [
      h.div(
        [
          h.Class(
            'group flex items-center gap-1 md:hover-capable:gap-0 mb-2 md:hover-capable:flex-row-reverse md:hover-capable:justify-end md:hover-capable:-ml-[1.5rem]',
          ),
        ],
        [
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              h.h3(
                [
                  h.Class(
                    'text-base font-mono font-code text-gray-900 dark:text-white scroll-mt-6 wrap-anywhere',
                  ),
                  h.Id(id),
                ],
                [apiFunction.name],
              ),
              h.span(
                [
                  h.Class(
                    'text-xs px-2 py-0.5 rounded bg-accent-100 dark:bg-accent-900 text-accent-700 dark:text-accent-300',
                  ),
                ],
                ['function'],
              ),
              ...sourceLink(apiFunction.sourceUrl, apiFunction.name),
            ],
          ),
          renderHeadingLink(id, apiFunction.name),
        ],
      ),
      signaturesView(id, apiFunction, isSignatureDisclosureOpen, highlights, h),
    ],
  )
}

const allParameterDescriptions = (
  apiFunction: ApiFunction,
): ReadonlyArray<Html> =>
  pipe(
    Array.flatMap(apiFunction.signatures, signature => signature.parameters),
    Array.dedupeWith((a, b) => a.name === b.name),
    Array.filterMap(parameter =>
      Result.fromOption(
        Option.map(parameter.description, description =>
          ih.div(
            [ih.Class('mb-1')],
            [
              ih.span(
                [ih.Class('font-normal text-gray-900 dark:text-gray-200')],
                [parameter.name],
              ),
              ih.span(
                [ih.Class('text-gray-500 dark:text-gray-400')],
                [`: ${description}`],
              ),
            ],
          ),
        ),
        () => undefined,
      ),
    ),
    Array.match({
      onEmpty: () => [],
      onNonEmpty: items => [
        ih.div(
          [
            ih.Class(
              'mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-sm',
            ),
          ],
          items,
        ),
      ],
    }),
  )

const chevron = (isOpen: boolean): Html =>
  ih.span(
    [
      ih.Class(
        clsx('text-gray-500 dark:text-gray-400', {
          'rotate-180': isOpen,
        }),
      ),
    ],
    [Icon.chevronDown('w-4 h-4')],
  )

const disclosureButtonClassName =
  'w-full flex items-center justify-between px-3 py-2 text-left text-base cursor-pointer transition border border-gray-200 dark:border-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-800 rounded-lg data-[open]:rounded-b-none select-none'

const disclosurePanelClassName = 'rounded-b-lg overflow-x-auto'

const signaturesView = (
  key: string,
  apiFunction: ApiFunction,
  isSignatureDisclosureOpen: boolean | undefined,
  highlights: Highlights,
  h: HtmlBuilder<Message>,
): Html => {
  const maybeHighlighted = Record.get(highlights, key)
  const isInDisclosure = isSignatureDisclosureOpen !== undefined

  const { wrapperClass, content } = Option.match(maybeHighlighted, {
    onSome: highlighted => ({
      wrapperClass: clsx(
        'text-sm [&_pre]:!py-4 [&_pre]:!pl-4 [&_pre]:!pr-0 [&_code]:block [&_code]:w-fit [&_code]:min-w-full [&_code]:pr-4',
        {
          'rounded [&_pre]:!rounded': !isInDisclosure,
          'rounded-b-lg rounded-t-none [&_pre]:!rounded-b-lg [&_pre]:!rounded-t-none':
            isInDisclosure,
        },
      ),
      content: [
        h.div([h.InnerHTML(highlighted)]),
        ...allParameterDescriptions(apiFunction),
      ],
    }),
    onNone: () => ({
      wrapperClass: clsx('bg-cream dark:bg-gray-800 p-4 font-mono text-sm', {
        rounded: !isInDisclosure,
        'rounded-b-lg rounded-t-none': isInDisclosure,
      }),
      content: [
        ...descriptionCommentFallback(apiFunction.description),
        ...Array.flatMap(apiFunction.signatures, signature =>
          signatureChildrenFallback(signature),
        ),
      ],
    }),
  })

  if (isSignatureDisclosureOpen !== undefined) {
    return Disclosure.view(
      {
        id: key,
        isOpen: isSignatureDisclosureOpen,
        onToggle: isOpen => Message.ToggledSignature({ id: key, isOpen }),
        toView: attributes =>
          h.div(
            [],
            [
              h.button(
                [...attributes.button, h.Class(disclosureButtonClassName)],
                [
                  h.div(
                    [h.Class('flex items-center justify-between w-full')],
                    [
                      h.span([], ['Show signature']),
                      chevron(isSignatureDisclosureOpen),
                    ],
                  ),
                ],
              ),
              isSignatureDisclosureOpen
                ? h.div(
                    [...attributes.panel, h.Class(disclosurePanelClassName)],
                    [h.div([h.Class(wrapperClass)], content)],
                  )
                : h.empty,
            ],
          ),
      },
      h,
    )
  } else {
    return h.div([h.Class(wrapperClass)], content)
  }
}

const parameterDescriptions = (
  parameters: ReadonlyArray<ApiParameter>,
): ReadonlyArray<Html> =>
  pipe(
    parameters,
    Array.filterMap(parameter =>
      Result.fromOption(
        Option.map(parameter.description, description =>
          ih.div(
            [ih.Class('mb-1')],
            [
              ih.span(
                [ih.Class('font-normal text-gray-900 dark:text-gray-200')],
                [parameter.name],
              ),
              ih.span(
                [ih.Class('text-gray-500 dark:text-gray-400')],
                [`: ${description}`],
              ),
            ],
          ),
        ),
        () => undefined,
      ),
    ),
    Array.match({
      onEmpty: () => [],
      onNonEmpty: items => [
        ih.div(
          [
            ih.Class(
              'mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-sm',
            ),
          ],
          items,
        ),
      ],
    }),
  )

const punctuation = (text: string): Html =>
  ih.span([ih.Class('text-gray-500')], [text])

const parameterView = (parameter: ApiParameter): ReadonlyArray<Html> => [
  ...(parameter.isRest ? [punctuation('...')] : []),
  ih.span(
    [ih.Class('font-normal text-gray-900 dark:text-gray-200')],
    [parameter.name],
  ),
  ...(parameter.isOptional ? [punctuation('?')] : []),
  punctuation(': '),
  ih.span([ih.Class('whitespace-pre-wrap')], [parameter.type]),
]

const parameterListView = (
  parameters: ReadonlyArray<ApiParameter>,
): ReadonlyArray<Html> =>
  Array.match(parameters, {
    onEmpty: () => [ih.div([ih.Class('mb-2')], [punctuation('()')])],
    onNonEmpty: nonEmpty => [
      ih.div(
        [ih.Class('mb-2')],
        [
          punctuation('('),
          ...Array.flatMap(nonEmpty, (parameter, index) => [
            ...(index > 0 ? [punctuation(', ')] : []),
            ...parameterView(parameter),
          ]),
          punctuation(')'),
        ],
      ),
      ...parameterDescriptions(nonEmpty),
    ],
  })

const returnTypeView = (returnType: string): Html =>
  ih.div(
    [ih.Class('whitespace-pre-wrap')],
    [
      punctuation('→ '),
      ih.span([ih.Class('text-accent-600 dark:text-accent-400')], [returnType]),
    ],
  )

const descriptionCommentFallback = (
  maybeDescription: Option.Option<string>,
): ReadonlyArray<Html> =>
  Option.match(maybeDescription, {
    onNone: () => [],
    onSome: description => [
      ih.div(
        [ih.Class('text-gray-500 dark:text-gray-400 mb-3 whitespace-pre-wrap')],
        [`/** ${description} */`],
      ),
    ],
  })

const signatureChildrenFallback = (signature: {
  readonly parameters: ReadonlyArray<ApiParameter>
  readonly returnType: string
  readonly typeParameters: ReadonlyArray<string>
}): ReadonlyArray<Html> => [
  ...Array.match(signature.typeParameters, {
    onEmpty: () => [],
    onNonEmpty: typeParameters => [
      ih.div(
        [ih.Class('text-gray-500 mb-2')],
        [`<${Array.join(typeParameters, ', ')}>`],
      ),
    ],
  }),
  ...parameterListView(signature.parameters),
  returnTypeView(signature.returnType),
]

const typeView = (
  moduleName: string,
  type: ApiType,
  highlights: Highlights,
  renderHeadingLink: RenderHeadingLink,
  h: HtmlBuilder<Message>,
): Html => {
  const id = scopedId('type', moduleName, type.name)
  const maybeHighlighted = Record.get(highlights, id)

  return h.div(
    [h.Class('mb-6')],
    [
      h.div(
        [
          h.Class(
            'group flex items-center gap-1 md:hover-capable:gap-0 mb-2 md:hover-capable:flex-row-reverse md:hover-capable:justify-end md:hover-capable:-ml-[1.5rem]',
          ),
        ],
        [
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              h.h3(
                [
                  h.Class(
                    'text-base font-mono font-code text-gray-900 dark:text-white scroll-mt-6 wrap-anywhere',
                  ),
                  h.Id(id),
                ],
                [type.name],
              ),
              h.span(
                [
                  h.Class(
                    'text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
                  ),
                ],
                ['type'],
              ),
              ...sourceLink(type.sourceUrl, type.name),
            ],
          ),
          renderHeadingLink(id, type.name),
        ],
      ),
      ...Option.match(maybeHighlighted, {
        onSome: highlighted => [
          h.div([
            h.Class(
              'rounded text-sm [&_pre]:!rounded [&_pre]:!py-4 [&_pre]:!pl-4 [&_pre]:!pr-0 [&_code]:block [&_code]:w-fit [&_code]:min-w-full [&_code]:pr-4',
            ),
            h.InnerHTML(highlighted),
          ]),
        ],
        onNone: () => [
          h.div(
            [
              h.Class(
                'block bg-gray-50 dark:bg-gray-800 rounded p-4 font-mono text-sm whitespace-pre-wrap',
              ),
            ],
            [
              ...descriptionCommentFallback(type.description),
              type.typeDefinition,
            ],
          ),
        ],
      }),
    ],
  )
}

const interfaceView = (
  moduleName: string,
  apiInterface: ApiInterface,
  highlights: Highlights,
  renderHeadingLink: RenderHeadingLink,
  h: HtmlBuilder<Message>,
): Html => {
  const id = scopedId('interface', moduleName, apiInterface.name)
  const maybeHighlighted = Record.get(highlights, id)

  return h.div(
    [h.Class('mb-6')],
    [
      h.div(
        [
          h.Class(
            'group flex items-center gap-1 md:hover-capable:gap-0 mb-2 md:hover-capable:flex-row-reverse md:hover-capable:justify-end md:hover-capable:-ml-[1.5rem]',
          ),
        ],
        [
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              h.h3(
                [
                  h.Class(
                    'text-base font-mono font-code text-gray-900 dark:text-white scroll-mt-6 wrap-anywhere',
                  ),
                  h.Id(id),
                ],
                [apiInterface.name],
              ),
              h.span(
                [
                  h.Class(
                    'text-xs px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300',
                  ),
                ],
                ['interface'],
              ),
              ...sourceLink(apiInterface.sourceUrl, apiInterface.name),
            ],
          ),
          renderHeadingLink(id, apiInterface.name),
        ],
      ),
      ...Option.match(maybeHighlighted, {
        onSome: highlighted => [
          h.div([
            h.Class(
              'rounded text-sm [&_pre]:!rounded [&_pre]:!py-4 [&_pre]:!pl-4 [&_pre]:!pr-0 [&_code]:block [&_code]:w-fit [&_code]:min-w-full [&_code]:pr-4',
            ),
            h.InnerHTML(highlighted),
          ]),
        ],
        onNone: () => [
          h.div(
            [
              h.Class(
                'block bg-gray-50 dark:bg-gray-800 rounded p-4 font-mono text-sm whitespace-pre-wrap',
              ),
            ],
            [
              ...descriptionCommentFallback(apiInterface.description),
              apiInterface.typeDefinition,
            ],
          ),
        ],
      }),
    ],
  )
}

const variableView = (
  moduleName: string,
  variable: ApiVariable,
  highlights: Highlights,
  renderHeadingLink: RenderHeadingLink,
  h: HtmlBuilder<Message>,
): Html => {
  const id = scopedId('const', moduleName, variable.name)
  const maybeHighlighted = Record.get(highlights, id)

  return h.div(
    [h.Class('mb-6')],
    [
      h.div(
        [
          h.Class(
            'group flex items-center gap-1 md:hover-capable:gap-0 mb-2 md:hover-capable:flex-row-reverse md:hover-capable:justify-end md:hover-capable:-ml-[1.5rem]',
          ),
        ],
        [
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              h.h3(
                [
                  h.Class(
                    'text-base font-mono font-code text-gray-900 dark:text-white scroll-mt-6 wrap-anywhere',
                  ),
                  h.Id(id),
                ],
                [variable.name],
              ),
              h.span(
                [
                  h.Class(
                    'text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
                  ),
                ],
                ['const'],
              ),
              ...sourceLink(variable.sourceUrl, variable.name),
            ],
          ),
          renderHeadingLink(id, variable.name),
        ],
      ),
      ...Option.match(maybeHighlighted, {
        onSome: highlighted => [
          h.div([
            h.Class(
              'rounded text-sm [&_pre]:!rounded [&_pre]:!py-4 [&_pre]:!pl-4 [&_pre]:!pr-0 [&_code]:block [&_code]:w-fit [&_code]:min-w-full [&_code]:pr-4',
            ),
            h.InnerHTML(highlighted),
          ]),
        ],
        onNone: () => [
          h.div(
            [
              h.Class(
                'block bg-gray-50 dark:bg-gray-800 rounded p-4 font-mono text-sm whitespace-pre-wrap',
              ),
            ],
            [
              ...descriptionCommentFallback(variable.description),
              variable.type,
            ],
          ),
        ],
      }),
    ],
  )
}

const section = <T extends { readonly name: string }>(
  moduleName: string,
  label: string,
  items: ReadonlyArray<T>,
  renderHeadingLink: RenderHeadingLink,
  itemView: (item: T) => Html,
): ReadonlyArray<Html> =>
  Array.match(items, {
    onEmpty: () => [],
    onNonEmpty: items => [
      headingWithContent(
        'h2',
        sectionId(moduleName, label),
        label,
        [label],
        renderHeadingLink,
      ),
      ...Array.map(items, itemView),
    ],
  })

type ViewInputs = Readonly<{
  module: ApiModule
  highlights: Highlights
  renderHeadingLink: RenderHeadingLink
}>

/**
 * Renders one API module: its sections and every function, type, interface, and
 * constant it exports.
 *
 * The page is dispatched through `h.submodel`, so it takes `renderHeadingLink`
 * from its parent rather than building the copy-link itself. The control carries
 * an app-level Message, and a handler's dispatcher comes from the frame the
 * element is built in, so one built here would be rejected by this Submodel's
 * `toParentMessage`.
 */
export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { module, highlights, renderHeadingLink }, h): Html =>
    h.div(
      [h.DataAttribute('pagefind-meta', 'kind:API Reference')],
      [
        pageTitle(module.name, module.name),
        ...section(
          module.name,
          'Functions',
          module.functions,
          renderHeadingLink,
          apiFunction => {
            const key = scopedId('function', module.name, apiFunction.name)
            return lazyItem(key, functionView, [
              module.name,
              apiFunction,
              model.disclosures[key],
              highlights,
              renderHeadingLink,
              h,
            ])
          },
        ),
        ...section(
          module.name,
          'Types',
          module.types,
          renderHeadingLink,
          type => {
            const key = scopedId('type', module.name, type.name)
            return lazyItem(key, typeView, [
              module.name,
              type,
              highlights,
              renderHeadingLink,
              h,
            ])
          },
        ),
        ...section(
          module.name,
          'Interfaces',
          module.interfaces,
          renderHeadingLink,
          apiInterface => {
            const key = scopedId('interface', module.name, apiInterface.name)
            return lazyItem(key, interfaceView, [
              module.name,
              apiInterface,
              highlights,
              renderHeadingLink,
              h,
            ])
          },
        ),
        ...section(
          module.name,
          'Constants',
          module.variables,
          renderHeadingLink,
          variable => {
            const key = scopedId('const', module.name, variable.name)
            return lazyItem(key, variableView, [
              module.name,
              variable,
              highlights,
              renderHeadingLink,
              h,
            ])
          },
        ),
      ],
    ),
)

const skeletonFunctionBlocks: ReadonlyArray<{
  readonly id: string
  readonly labelWidth: string
  readonly bodyHeight: string
}> = [
  { id: 'skeleton-block-0', labelWidth: 'w-56', bodyHeight: 'h-24' },
  { id: 'skeleton-block-1', labelWidth: 'w-48', bodyHeight: 'h-20' },
  { id: 'skeleton-block-2', labelWidth: 'w-64', bodyHeight: 'h-28' },
  { id: 'skeleton-block-3', labelWidth: 'w-40', bodyHeight: 'h-16' },
  { id: 'skeleton-block-4', labelWidth: 'w-52', bodyHeight: 'h-24' },
  { id: 'skeleton-block-5', labelWidth: 'w-44', bodyHeight: 'h-20' },
]

const skeletonSurfaceClass = 'bg-gray-200 dark:bg-gray-800'

export const skeletonView = (): Html =>
  ih.div(
    [ih.Class('animate-pulse')],
    [
      ih.div([ih.Class(`h-10 w-72 mb-10 rounded ${skeletonSurfaceClass}`)]),
      ih.div([ih.Class(`h-7 w-36 mb-6 rounded ${skeletonSurfaceClass}`)]),
      ...Array.map(skeletonFunctionBlocks, ({ id, labelWidth, bodyHeight }) =>
        ih.keyed('div')(
          id,
          [ih.Class('mb-8')],
          [
            ih.div([
              ih.Class(
                `h-5 ${labelWidth} mb-3 rounded ${skeletonSurfaceClass}`,
              ),
            ]),
            ih.div([
              ih.Class(`${bodyHeight} w-full rounded ${skeletonSurfaceClass}`),
            ]),
          ],
        ),
      ),
    ],
  )

export const failureView = (error: string): Html =>
  ih.div(
    [ih.Class('rounded-lg border border-red-300 dark:border-red-800 p-6')],
    [
      ih.h3(
        [
          ih.Class(
            'text-base font-semibold text-red-700 dark:text-red-400 mb-2',
          ),
        ],
        ['Failed to load API reference'],
      ),
      ih.div([ih.Class('text-sm text-gray-600 dark:text-gray-400')], [error]),
    ],
  )
