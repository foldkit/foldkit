import { clsx } from 'clsx'
import { Array, Option, Record, Result, pipe } from 'effect'
import { Ui } from 'foldkit'
import { Html, createKeyedLazy, html } from 'foldkit/html'
import { Disclosure } from 'foldkit/ui'

import { Icon } from '../../icon'
import { heading, headingLinkButton, pageTitle } from '../../prose'
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
import { GotDisclosureMessage, type Message } from './message'
import type { ApiData, Disclosures } from './model'

type Highlights = ApiData['highlights']

const sourceLink = <ParentMessage>(
  sourceUrl: Option.Option<string>,
  name: string,
): ReadonlyArray<Html> => {
  const h = html<ParentMessage>()

  return Option.match(sourceUrl, {
    onNone: () => [],
    onSome: url => [
      h.a(
        [
          h.Class(
            'text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
          ),
          h.AriaLabel(`View source for ${name}`),
          h.Href(url),
        ],
        ['source'],
      ),
    ],
  })
}

const lazyItem = createKeyedLazy()

const functionView = <ParentMessage>(
  moduleName: string,
  apiFunction: ApiFunction,
  maybeDisclosure: Disclosure.Model | undefined,
  highlights: Highlights,
  toParentMessage: (message: Message) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()
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
            [h.Class('flex items-center gap-2')],
            [
              h.h3(
                [
                  h.Class(
                    'text-base font-mono font-code text-gray-900 dark:text-white scroll-mt-6',
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
              ...sourceLink<ParentMessage>(
                apiFunction.sourceUrl,
                apiFunction.name,
              ),
            ],
          ),
          headingLinkButton(id, apiFunction.name),
        ],
      ),
      signaturesView<ParentMessage>(
        id,
        apiFunction,
        maybeDisclosure,
        highlights,
        toParentMessage,
      ),
    ],
  )
}

const allParameterDescriptions = <ParentMessage>(
  apiFunction: ApiFunction,
): ReadonlyArray<Html> => {
  const h = html<ParentMessage>()

  return pipe(
    Array.flatMap(apiFunction.signatures, signature => signature.parameters),
    Array.dedupeWith((a, b) => a.name === b.name),
    Array.filterMap(parameter =>
      Result.fromOption(
        Option.map(parameter.description, description =>
          h.div(
            [h.Class('mb-1')],
            [
              h.span(
                [h.Class('font-normal text-gray-900 dark:text-gray-200')],
                [parameter.name],
              ),
              h.span(
                [h.Class('text-gray-500 dark:text-gray-400')],
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
        h.div(
          [
            h.Class(
              'mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-sm',
            ),
          ],
          items,
        ),
      ],
    }),
  )
}

const chevron = <ParentMessage>(isOpen: boolean): Html => {
  const h = html<ParentMessage>()

  return h.span(
    [
      h.Class(
        clsx('text-gray-500 dark:text-gray-400', {
          'rotate-180': isOpen,
        }),
      ),
    ],
    [Icon.chevronDown('w-4 h-4')],
  )
}

const disclosureButtonClassName =
  'w-full flex items-center justify-between px-3 py-2 text-left text-base cursor-pointer transition border border-gray-200 dark:border-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-800 rounded-lg data-[open]:rounded-b-none select-none'

const disclosurePanelClassName = 'rounded-b-lg overflow-x-auto'

const signaturesView = <ParentMessage>(
  key: string,
  apiFunction: ApiFunction,
  maybeDisclosure: Disclosure.Model | undefined,
  highlights: Highlights,
  toParentMessage: (message: Message) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()
  const maybeHighlighted = Record.get(highlights, key)
  const isInDisclosure = maybeDisclosure !== undefined

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
        h.div([h.InnerHTML(highlighted)], []),
        ...allParameterDescriptions<ParentMessage>(apiFunction),
      ],
    }),
    onNone: () => ({
      wrapperClass: clsx('bg-cream dark:bg-gray-800 p-4 font-mono text-sm', {
        rounded: !isInDisclosure,
        'rounded-b-lg rounded-t-none': isInDisclosure,
      }),
      content: [
        ...descriptionCommentFallback<ParentMessage>(apiFunction.description),
        ...Array.flatMap(apiFunction.signatures, signature =>
          signatureChildrenFallback<ParentMessage>(signature),
        ),
      ],
    }),
  })

  return maybeDisclosure !== undefined
    ? Ui.Disclosure.view({
        model: maybeDisclosure,
        toParentMessage: message =>
          toParentMessage(GotDisclosureMessage({ id: key, message })),
        buttonAttributes: [h.Class(disclosureButtonClassName)],
        buttonContent: h.div(
          [h.Class('flex items-center justify-between w-full')],
          [
            h.span([], ['Show signature']),
            chevron<ParentMessage>(maybeDisclosure.isOpen),
          ],
        ),
        panelAttributes: [h.Class(disclosurePanelClassName)],
        panelContent: h.div([h.Class(wrapperClass)], content),
      })
    : h.div([h.Class(wrapperClass)], content)
}

const parameterDescriptions = <ParentMessage>(
  parameters: ReadonlyArray<ApiParameter>,
): ReadonlyArray<Html> => {
  const h = html<ParentMessage>()

  return pipe(
    parameters,
    Array.filterMap(parameter =>
      Result.fromOption(
        Option.map(parameter.description, description =>
          h.div(
            [h.Class('mb-1')],
            [
              h.span(
                [h.Class('font-normal text-gray-900 dark:text-gray-200')],
                [parameter.name],
              ),
              h.span(
                [h.Class('text-gray-500 dark:text-gray-400')],
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
        h.div(
          [
            h.Class(
              'mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-sm',
            ),
          ],
          items,
        ),
      ],
    }),
  )
}

const punctuation = <ParentMessage>(text: string): Html => {
  const h = html<ParentMessage>()

  return h.span([h.Class('text-gray-500')], [text])
}

const parameterView = <ParentMessage>(
  parameter: ApiParameter,
): ReadonlyArray<Html> => {
  const h = html<ParentMessage>()

  return [
    h.span(
      [h.Class('font-normal text-gray-900 dark:text-gray-200')],
      [parameter.name],
    ),
    ...(parameter.isOptional ? [punctuation<ParentMessage>('?')] : []),
    punctuation<ParentMessage>(': '),
    h.span([h.Class('whitespace-pre-wrap')], [parameter.type]),
  ]
}

const parameterListView = <ParentMessage>(
  parameters: ReadonlyArray<ApiParameter>,
): ReadonlyArray<Html> => {
  const h = html<ParentMessage>()

  return Array.match(parameters, {
    onEmpty: () => [
      h.div([h.Class('mb-2')], [punctuation<ParentMessage>('()')]),
    ],
    onNonEmpty: nonEmpty => [
      h.div(
        [h.Class('mb-2')],
        [
          punctuation<ParentMessage>('('),
          ...Array.flatMap(nonEmpty, (parameter, index) => [
            ...(index > 0 ? [punctuation<ParentMessage>(', ')] : []),
            ...parameterView<ParentMessage>(parameter),
          ]),
          punctuation<ParentMessage>(')'),
        ],
      ),
      ...parameterDescriptions<ParentMessage>(nonEmpty),
    ],
  })
}

const returnTypeView = <ParentMessage>(returnType: string): Html => {
  const h = html<ParentMessage>()

  return h.div(
    [h.Class('whitespace-pre-wrap')],
    [
      punctuation<ParentMessage>('→ '),
      h.span([h.Class('text-accent-600 dark:text-accent-400')], [returnType]),
    ],
  )
}

const descriptionCommentFallback = <ParentMessage>(
  maybeDescription: Option.Option<string>,
): ReadonlyArray<Html> => {
  const h = html<ParentMessage>()

  return Option.match(maybeDescription, {
    onNone: () => [],
    onSome: description => [
      h.div(
        [h.Class('text-gray-500 dark:text-gray-400 mb-3 whitespace-pre-wrap')],
        [`/** ${description} */`],
      ),
    ],
  })
}

const signatureChildrenFallback = <ParentMessage>(signature: {
  readonly parameters: ReadonlyArray<ApiParameter>
  readonly returnType: string
  readonly typeParameters: ReadonlyArray<string>
}): ReadonlyArray<Html> => {
  const h = html<ParentMessage>()

  return [
    ...Array.match(signature.typeParameters, {
      onEmpty: () => [],
      onNonEmpty: typeParameters => [
        h.div(
          [h.Class('text-gray-500 mb-2')],
          [`<${Array.join(typeParameters, ', ')}>`],
        ),
      ],
    }),
    ...parameterListView<ParentMessage>(signature.parameters),
    returnTypeView<ParentMessage>(signature.returnType),
  ]
}

const typeView = <ParentMessage>(
  moduleName: string,
  type: ApiType,
  highlights: Highlights,
): Html => {
  const h = html<ParentMessage>()
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
            [h.Class('flex items-center gap-2')],
            [
              h.h3(
                [
                  h.Class(
                    'text-base font-mono font-code text-gray-900 dark:text-white scroll-mt-6',
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
              ...sourceLink<ParentMessage>(type.sourceUrl, type.name),
            ],
          ),
          headingLinkButton(id, type.name),
        ],
      ),
      ...Option.match(maybeHighlighted, {
        onSome: highlighted => [
          h.div(
            [
              h.Class(
                'rounded text-sm [&_pre]:!rounded [&_pre]:!py-4 [&_pre]:!pl-4 [&_pre]:!pr-0 [&_code]:block [&_code]:w-fit [&_code]:min-w-full [&_code]:pr-4',
              ),
              h.InnerHTML(highlighted),
            ],
            [],
          ),
        ],
        onNone: () => [
          h.div(
            [
              h.Class(
                'block bg-gray-50 dark:bg-gray-800 rounded p-4 font-mono text-sm whitespace-pre-wrap',
              ),
            ],
            [
              ...descriptionCommentFallback<ParentMessage>(type.description),
              type.typeDefinition,
            ],
          ),
        ],
      }),
    ],
  )
}

const interfaceView = <ParentMessage>(
  moduleName: string,
  apiInterface: ApiInterface,
  highlights: Highlights,
): Html => {
  const h = html<ParentMessage>()
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
            [h.Class('flex items-center gap-2')],
            [
              h.h3(
                [
                  h.Class(
                    'text-base font-mono font-code text-gray-900 dark:text-white scroll-mt-6',
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
              ...sourceLink<ParentMessage>(
                apiInterface.sourceUrl,
                apiInterface.name,
              ),
            ],
          ),
          headingLinkButton(id, apiInterface.name),
        ],
      ),
      ...Option.match(maybeHighlighted, {
        onSome: highlighted => [
          h.div(
            [
              h.Class(
                'rounded text-sm [&_pre]:!rounded [&_pre]:!py-4 [&_pre]:!pl-4 [&_pre]:!pr-0 [&_code]:block [&_code]:w-fit [&_code]:min-w-full [&_code]:pr-4',
              ),
              h.InnerHTML(highlighted),
            ],
            [],
          ),
        ],
        onNone: () => [
          h.div(
            [
              h.Class(
                'block bg-gray-50 dark:bg-gray-800 rounded p-4 font-mono text-sm whitespace-pre-wrap',
              ),
            ],
            [
              ...descriptionCommentFallback<ParentMessage>(
                apiInterface.description,
              ),
              apiInterface.typeDefinition,
            ],
          ),
        ],
      }),
    ],
  )
}

const variableView = <ParentMessage>(
  moduleName: string,
  variable: ApiVariable,
  highlights: Highlights,
): Html => {
  const h = html<ParentMessage>()
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
            [h.Class('flex items-center gap-2')],
            [
              h.h3(
                [
                  h.Class(
                    'text-base font-mono font-code text-gray-900 dark:text-white scroll-mt-6',
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
              ...sourceLink<ParentMessage>(variable.sourceUrl, variable.name),
            ],
          ),
          headingLinkButton(id, variable.name),
        ],
      ),
      ...Option.match(maybeHighlighted, {
        onSome: highlighted => [
          h.div(
            [
              h.Class(
                'rounded text-sm [&_pre]:!rounded [&_pre]:!py-4 [&_pre]:!pl-4 [&_pre]:!pr-0 [&_code]:block [&_code]:w-fit [&_code]:min-w-full [&_code]:pr-4',
              ),
              h.InnerHTML(highlighted),
            ],
            [],
          ),
        ],
        onNone: () => [
          h.div(
            [
              h.Class(
                'block bg-gray-50 dark:bg-gray-800 rounded p-4 font-mono text-sm whitespace-pre-wrap',
              ),
            ],
            [
              ...descriptionCommentFallback<ParentMessage>(
                variable.description,
              ),
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
  itemView: (item: T) => Html,
): ReadonlyArray<Html> =>
  Array.match(items, {
    onEmpty: () => [],
    onNonEmpty: items => [
      heading('h2', sectionId(moduleName, label), label),
      ...Array.map(items, itemView),
    ],
  })

export const view = <ParentMessage>(
  module: ApiModule,
  disclosures: Disclosures,
  highlights: Highlights,
  toParentMessage: (message: Message) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  return h.div(
    [h.DataAttribute('pagefind-meta', 'kind:API Reference')],
    [
      pageTitle(module.name, module.name),
      ...section(module.name, 'Functions', module.functions, apiFunction => {
        const key = scopedId('function', module.name, apiFunction.name)
        return lazyItem(key, functionView<ParentMessage>, [
          module.name,
          apiFunction,
          disclosures[key],
          highlights,
          toParentMessage,
        ])
      }),
      ...section(module.name, 'Types', module.types, type => {
        const key = scopedId('type', module.name, type.name)
        return lazyItem(key, typeView<ParentMessage>, [
          module.name,
          type,
          highlights,
        ])
      }),
      ...section(module.name, 'Interfaces', module.interfaces, apiInterface => {
        const key = scopedId('interface', module.name, apiInterface.name)
        return lazyItem(key, interfaceView<ParentMessage>, [
          module.name,
          apiInterface,
          highlights,
        ])
      }),
      ...section(module.name, 'Constants', module.variables, variable => {
        const key = scopedId('const', module.name, variable.name)
        return lazyItem(key, variableView<ParentMessage>, [
          module.name,
          variable,
          highlights,
        ])
      }),
    ],
  )
}

const skeletonFunctionBlocks: ReadonlyArray<{
  readonly labelWidth: string
  readonly bodyHeight: string
}> = [
  { labelWidth: 'w-56', bodyHeight: 'h-24' },
  { labelWidth: 'w-48', bodyHeight: 'h-20' },
  { labelWidth: 'w-64', bodyHeight: 'h-28' },
  { labelWidth: 'w-40', bodyHeight: 'h-16' },
  { labelWidth: 'w-52', bodyHeight: 'h-24' },
  { labelWidth: 'w-44', bodyHeight: 'h-20' },
]

const skeletonSurfaceClass = 'bg-gray-200 dark:bg-gray-800'

export const skeletonView = <ParentMessage>(): Html => {
  const h = html<ParentMessage>()

  return h.div(
    [h.Class('animate-pulse')],
    [
      h.div([h.Class(`h-10 w-72 mb-10 rounded ${skeletonSurfaceClass}`)], []),
      h.div([h.Class(`h-7 w-36 mb-6 rounded ${skeletonSurfaceClass}`)], []),
      ...Array.map(skeletonFunctionBlocks, ({ labelWidth, bodyHeight }) =>
        h.div(
          [h.Class('mb-8')],
          [
            h.div(
              [
                h.Class(
                  `h-5 ${labelWidth} mb-3 rounded ${skeletonSurfaceClass}`,
                ),
              ],
              [],
            ),
            h.div(
              [h.Class(`${bodyHeight} w-full rounded ${skeletonSurfaceClass}`)],
              [],
            ),
          ],
        ),
      ),
    ],
  )
}

export const failureView = <ParentMessage>(error: string): Html => {
  const h = html<ParentMessage>()

  return h.div(
    [h.Class('rounded-lg border border-red-300 dark:border-red-800 p-6')],
    [
      h.h3(
        [
          h.Class(
            'text-base font-semibold text-red-700 dark:text-red-400 mb-2',
          ),
        ],
        ['Failed to load API reference'],
      ),
      h.div([h.Class('text-sm text-gray-600 dark:text-gray-400')], [error]),
    ],
  )
}
