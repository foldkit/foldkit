import classNames from 'classnames'
import { Array, Option, Record, String, pipe } from 'effect'
import { Ui } from 'foldkit'
import { Html, createKeyedLazy } from 'foldkit/html'
import { Disclosure } from 'foldkit/ui'
import highlights from 'virtual:api-highlights'

import {
  AriaLabel,
  Class,
  Href,
  Id,
  InnerHTML,
  a,
  div,
  h3,
  p,
  span,
} from '../../html'
import { Icon } from '../../icon'
import type { Message as ParentMessage } from '../../main'
import {
  heading,
  headingLinkButton,
  inlineCode,
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
} from './domain'
import { GotDisclosureMessage, type Message } from './message'
import type { Model } from './model'

const descriptionWithCode = (
  text: string,
): ReadonlyArray<Html | string> => {
  const parts = String.split(text, '`')
  return Array.map(parts, (part, index) =>
    index % 2 === 1 ? inlineCode(part) : part,
  )
}

const descriptionView = (description: string): ReadonlyArray<Html> =>
  pipe(
    String.split(description, '\n\n'),
    Array.map(String.trim),
    Array.filter(String.isNonEmpty),
    Array.map(paragraph =>
      p(
        [Class('text-gray-600 dark:text-gray-400 mb-2')],
        descriptionWithCode(paragraph),
      ),
    ),
  )

const sourceLink = (
  sourceUrl: Option.Option<string>,
  name: string,
): ReadonlyArray<Html> =>
  Option.match(sourceUrl, {
    onNone: () => [],
    onSome: url => [
      a(
        [
          Class(
            'text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
          ),
          AriaLabel(`View source for ${name}`),
          Href(url),
        ],
        ['source'],
      ),
    ],
  })

const lazyItem = createKeyedLazy()

const functionView = (
  moduleName: string,
  apiFunction: ApiFunction,
  maybeDisclosure: Disclosure.Model | undefined,
  toMessage: (message: Message) => ParentMessage,
): Html => {
  const id = scopedId('function', moduleName, apiFunction.name)

  return div(
    [Class('mb-8')],
    [
      div(
        [
          Class(
            'group flex items-center gap-1 mb-2 md:flex-row-reverse md:justify-end md:-ml-8',
          ),
        ],
        [
          div(
            [Class('flex items-center gap-2')],
            [
              h3(
                [
                  Class(
                    'text-base font-mono font-medium text-gray-900 dark:text-white scroll-mt-6',
                  ),
                  Id(id),
                ],
                [apiFunction.name],
              ),
              span(
                [
                  Class(
                    'text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
                  ),
                ],
                ['function'],
              ),
              ...sourceLink(apiFunction.sourceUrl, apiFunction.name),
            ],
          ),
          headingLinkButton(id, apiFunction.name),
        ],
      ),
      ...Option.match(apiFunction.description, {
        onNone: () => [],
        onSome: descriptionView,
      }),
      signaturesView(id, apiFunction, maybeDisclosure, toMessage),
    ],
  )
}

const allParameterDescriptions = (
  apiFunction: ApiFunction,
): ReadonlyArray<Html> =>
  pipe(
    Array.flatMap(
      apiFunction.signatures,
      signature => signature.parameters,
    ),
    Array.dedupeWith((a, b) => a.name === b.name),
    Array.filterMap(parameter =>
      Option.map(parameter.description, description =>
        div(
          [Class('mb-1')],
          [
            span(
              [Class('font-medium text-gray-900 dark:text-gray-200')],
              [parameter.name],
            ),
            span(
              [Class('text-gray-500 dark:text-gray-400')],
              [` — ${description}`],
            ),
          ],
        ),
      ),
    ),
    Array.match({
      onEmpty: () => [],
      onNonEmpty: items => [
        div(
          [
            Class(
              'mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-sm',
            ),
          ],
          items,
        ),
      ],
    }),
  )

const chevron = (isOpen: boolean) =>
  span(
    [
      Class(
        classNames('text-gray-500 dark:text-gray-400', {
          'rotate-180': isOpen,
        }),
      ),
    ],
    [Icon.chevronDown('w-4 h-4')],
  )

const disclosureButtonClassName =
  'w-full flex items-center justify-between px-3 py-2 text-left text-base cursor-pointer transition border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-800 rounded-lg data-[open]:rounded-b-none select-none'

const disclosurePanelClassName = 'rounded-b-lg overflow-x-auto'

const signaturesView = (
  key: string,
  apiFunction: ApiFunction,
  maybeDisclosure: Disclosure.Model | undefined,
  toMessage: (message: Message) => ParentMessage,
): Html => {
  const maybeHighlighted = Record.get(highlights, key)
  const isInDisclosure = maybeDisclosure !== undefined

  const { wrapperClass, content } = Option.match(maybeHighlighted, {
    onSome: highlighted => ({
      wrapperClass: classNames(
        'text-sm [&_pre]:!py-4 [&_pre]:!pl-4 [&_pre]:!pr-0 [&_code]:block [&_code]:w-fit [&_code]:min-w-full [&_code]:pr-4',
        {
          'rounded [&_pre]:!rounded': !isInDisclosure,
          'rounded-b-lg rounded-t-none [&_pre]:!rounded-b-lg [&_pre]:!rounded-t-none':
            isInDisclosure,
        },
      ),
      content: [
        div([InnerHTML(highlighted)], []),
        ...allParameterDescriptions(apiFunction),
      ],
    }),
    onNone: () => ({
      wrapperClass: classNames(
        'bg-white dark:bg-gray-800 p-4 font-mono text-sm',
        {
          rounded: !isInDisclosure,
          'rounded-b-lg rounded-t-none': isInDisclosure,
        },
      ),
      content: Array.flatMap(apiFunction.signatures, signature =>
        signatureChildrenFallback(signature),
      ),
    }),
  })

  return maybeDisclosure !== undefined
    ? Ui.Disclosure.view({
        model: maybeDisclosure,
        toMessage: message =>
          toMessage(GotDisclosureMessage({ id: key, message })),
        buttonClassName: disclosureButtonClassName,
        buttonContent: div(
          [Class('flex items-center justify-between w-full')],
          [
            span([], ['Show signature']),
            chevron(maybeDisclosure.isOpen),
          ],
        ),
        panelClassName: disclosurePanelClassName,
        panelContent: div([Class(wrapperClass)], content),
      })
    : div([Class(wrapperClass)], content)
}

const parameterDescriptions = (
  parameters: ReadonlyArray<ApiParameter>,
): ReadonlyArray<Html> =>
  pipe(
    parameters,
    Array.filterMap(parameter =>
      Option.map(parameter.description, description =>
        div(
          [Class('mb-1')],
          [
            span(
              [Class('font-medium text-gray-900 dark:text-gray-200')],
              [parameter.name],
            ),
            span(
              [Class('text-gray-500 dark:text-gray-400')],
              [` — ${description}`],
            ),
          ],
        ),
      ),
    ),
    Array.match({
      onEmpty: () => [],
      onNonEmpty: items => [
        div(
          [
            Class(
              'mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-sm',
            ),
          ],
          items,
        ),
      ],
    }),
  )

const punctuation = (text: string): Html =>
  span([Class('text-gray-500')], [text])

const parameterView = (
  parameter: ApiParameter,
): ReadonlyArray<Html> => [
  span(
    [Class('font-medium text-gray-900 dark:text-gray-200')],
    [parameter.name],
  ),
  ...(parameter.isOptional ? [punctuation('?')] : []),
  punctuation(': '),
  span([Class('whitespace-pre-wrap')], [parameter.type]),
]

const parameterListView = (
  parameters: ReadonlyArray<ApiParameter>,
): ReadonlyArray<Html> =>
  Array.match(parameters, {
    onEmpty: () => [div([Class('mb-2')], [punctuation('()')])],
    onNonEmpty: nonEmpty => [
      div(
        [Class('mb-2')],
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
  div(
    [Class('whitespace-pre-wrap')],
    [
      punctuation('→ '),
      span(
        [Class('text-green-600 dark:text-green-400')],
        [returnType],
      ),
    ],
  )

const signatureChildrenFallback = (signature: {
  readonly parameters: ReadonlyArray<ApiParameter>
  readonly returnType: string
  readonly typeParameters: ReadonlyArray<string>
}): ReadonlyArray<Html> => [
  ...Array.match(signature.typeParameters, {
    onEmpty: () => [],
    onNonEmpty: typeParameters => [
      div(
        [Class('text-gray-500 mb-2')],
        [`<${Array.join(typeParameters, ', ')}>`],
      ),
    ],
  }),
  ...parameterListView(signature.parameters),
  returnTypeView(signature.returnType),
]

const typeView = (moduleName: string, type: ApiType): Html => {
  const id = scopedId('type', moduleName, type.name)
  const maybeHighlighted = Record.get(highlights, id)

  return div(
    [Class('mb-6')],
    [
      div(
        [
          Class(
            'group flex items-center gap-1 mb-2 md:flex-row-reverse md:justify-end md:-ml-8',
          ),
        ],
        [
          div(
            [Class('flex items-center gap-2')],
            [
              h3(
                [
                  Class(
                    'text-base font-mono font-medium text-gray-900 dark:text-white scroll-mt-6',
                  ),
                  Id(id),
                ],
                [type.name],
              ),
              span(
                [
                  Class(
                    'text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
                  ),
                ],
                ['type'],
              ),
              ...sourceLink(type.sourceUrl, type.name),
            ],
          ),
          headingLinkButton(id, type.name),
        ],
      ),
      ...Option.match(type.description, {
        onNone: () => [],
        onSome: descriptionView,
      }),
      ...Option.match(maybeHighlighted, {
        onSome: highlighted => [
          div(
            [
              Class(
                'rounded text-sm [&_pre]:!rounded [&_pre]:!py-4 [&_pre]:!pl-4 [&_pre]:!pr-0 [&_code]:block [&_code]:w-fit [&_code]:min-w-full [&_code]:pr-4',
              ),
              InnerHTML(highlighted),
            ],
            [],
          ),
        ],
        onNone: () => [
          div(
            [
              Class(
                'block bg-gray-50 dark:bg-gray-800 rounded p-4 font-mono text-sm whitespace-pre-wrap',
              ),
            ],
            [type.typeDefinition],
          ),
        ],
      }),
    ],
  )
}

const interfaceView = (
  moduleName: string,
  apiInterface: ApiInterface,
): Html => {
  const id = scopedId('interface', moduleName, apiInterface.name)
  const maybeHighlighted = Record.get(highlights, id)

  return div(
    [Class('mb-6')],
    [
      div(
        [
          Class(
            'group flex items-center gap-1 mb-2 md:flex-row-reverse md:justify-end md:-ml-8',
          ),
        ],
        [
          div(
            [Class('flex items-center gap-2')],
            [
              h3(
                [
                  Class(
                    'text-base font-mono font-medium text-gray-900 dark:text-white scroll-mt-6',
                  ),
                  Id(id),
                ],
                [apiInterface.name],
              ),
              span(
                [
                  Class(
                    'text-xs px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300',
                  ),
                ],
                ['interface'],
              ),
              ...sourceLink(
                apiInterface.sourceUrl,
                apiInterface.name,
              ),
            ],
          ),
          headingLinkButton(id, apiInterface.name),
        ],
      ),
      ...Option.match(apiInterface.description, {
        onNone: () => [],
        onSome: descriptionView,
      }),
      ...Option.match(maybeHighlighted, {
        onSome: highlighted => [
          div(
            [
              Class(
                'rounded text-sm [&_pre]:!rounded [&_pre]:!py-4 [&_pre]:!pl-4 [&_pre]:!pr-0 [&_code]:block [&_code]:w-fit [&_code]:min-w-full [&_code]:pr-4',
              ),
              InnerHTML(highlighted),
            ],
            [],
          ),
        ],
        onNone: () => [
          div(
            [
              Class(
                'block bg-gray-50 dark:bg-gray-800 rounded p-4 font-mono text-sm whitespace-pre-wrap',
              ),
            ],
            [apiInterface.typeDefinition],
          ),
        ],
      }),
    ],
  )
}

const variableView = (
  moduleName: string,
  variable: ApiVariable,
): Html => {
  const id = scopedId('const', moduleName, variable.name)
  const maybeHighlighted = Record.get(highlights, id)

  return div(
    [Class('mb-6')],
    [
      div(
        [
          Class(
            'group flex items-center gap-1 mb-2 md:flex-row-reverse md:justify-end md:-ml-8',
          ),
        ],
        [
          div(
            [Class('flex items-center gap-2')],
            [
              h3(
                [
                  Class(
                    'text-base font-mono font-medium text-gray-900 dark:text-white scroll-mt-6',
                  ),
                  Id(id),
                ],
                [variable.name],
              ),
              span(
                [
                  Class(
                    'text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
                  ),
                ],
                ['const'],
              ),
              ...sourceLink(variable.sourceUrl, variable.name),
            ],
          ),
          headingLinkButton(id, variable.name),
        ],
      ),
      ...Option.match(variable.description, {
        onNone: () => [],
        onSome: descriptionView,
      }),
      ...Option.match(maybeHighlighted, {
        onSome: highlighted => [
          div(
            [
              Class(
                'rounded text-sm [&_pre]:!rounded [&_pre]:!py-4 [&_pre]:!pl-4 [&_pre]:!pr-0 [&_code]:block [&_code]:w-fit [&_code]:min-w-full [&_code]:pr-4',
              ),
              InnerHTML(highlighted),
            ],
            [],
          ),
        ],
        onNone: () => [
          div(
            [
              Class(
                'block bg-gray-50 dark:bg-gray-800 rounded p-4 font-mono text-sm whitespace-pre-wrap',
              ),
            ],
            [variable.type],
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
  itemView: (moduleName: string, item: T) => Html,
): ReadonlyArray<Html> =>
  Array.match(items, {
    onEmpty: () => [],
    onNonEmpty: items => [
      heading('h2', `${moduleName}-${label.toLowerCase()}`, label),
      ...Array.map(items, item => itemView(moduleName, item)),
    ],
  })

export const view = (
  module: ApiModule,
  model: Model,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      pageTitle(module.name, module.name),
      ...section(
        module.name,
        'Functions',
        module.functions,
        (moduleName, apiFunction) => {
          const key = scopedId(
            'function',
            moduleName,
            apiFunction.name,
          )
          return lazyItem(key, functionView, [
            moduleName,
            apiFunction,
            model[key],
            toMessage,
          ])
        },
      ),
      ...section(
        module.name,
        'Types',
        module.types,
        (moduleName, type) => {
          const key = scopedId('type', moduleName, type.name)
          return lazyItem(key, typeView, [moduleName, type])
        },
      ),
      ...section(
        module.name,
        'Interfaces',
        module.interfaces,
        (moduleName, apiInterface) => {
          const key = scopedId(
            'interface',
            moduleName,
            apiInterface.name,
          )
          return lazyItem(key, interfaceView, [
            moduleName,
            apiInterface,
          ])
        },
      ),
      ...section(
        module.name,
        'Constants',
        module.variables,
        (moduleName, variable) => {
          const key = scopedId('const', moduleName, variable.name)
          return lazyItem(key, variableView, [moduleName, variable])
        },
      ),
    ],
  )
