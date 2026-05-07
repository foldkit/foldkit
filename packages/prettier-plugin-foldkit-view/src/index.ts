import type { Doc, Plugin, Printer, SupportOption } from 'prettier'
import { printers as estreePrinters } from 'prettier/plugins/estree'

import {
  printArrayHugged,
  printCallHugged,
  printObjectHugged,
} from './print.js'
import { hasType, readChoiceOption, readStringOption } from './types.js'

const original: Printer = estreePrinters.estree

const VIEW_DSL_CALLEES_DEFAULT = [
  'a',
  'article',
  'aside',
  'audio',
  'b',
  'br',
  'button',
  'caption',
  'canvas',
  'cite',
  'code',
  'dd',
  'details',
  'dialog',
  'div',
  'dl',
  'dt',
  'em',
  'empty',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'i',
  'iframe',
  'img',
  'input',
  'kbd',
  'keyed',
  'label',
  'li',
  'main',
  'mark',
  'nav',
  'ol',
  'option',
  'p',
  'pre',
  'q',
  's',
  'section',
  'select',
  'small',
  'source',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'text',
  'textarea',
  'tfoot',
  'th',
  'thead',
  'time',
  'title',
  'tr',
  'u',
  'ul',
  'video',
].join(',')

const ARRAY_TOGGLE = ['on', 'off'] as const
const OBJECT_TOGGLE = ['on', 'off'] as const
const CALL_SCOPE_CHOICES = ['all', 'allowlist'] as const

const wrappedEstree: Printer = {
  ...original,
  print(path, options, print, args) {
    const node = path.node
    if (!hasType(node)) {
      return original.print(path, options, print, args)
    }

    const arrays = readChoiceOption(
      options,
      'foldkitViewArrays',
      ARRAY_TOGGLE,
      'on',
    )
    const objects = readChoiceOption(
      options,
      'foldkitViewObjects',
      OBJECT_TOGGLE,
      'on',
    )
    const callScope = readChoiceOption(
      options,
      'foldkitViewCallScope',
      CALL_SCOPE_CHOICES,
      'all',
    )
    const callees = readStringOption(
      options,
      'foldkitViewCallees',
      VIEW_DSL_CALLEES_DEFAULT,
    )
    const allowlist = new Set(callees.split(',').filter(s => s.length > 0))

    if (node.type === 'ArrayExpression' && arrays === 'on') {
      const fallback = (): Doc => original.print(path, options, print, args)
      return printArrayHugged({ path, options, print, fallback })
    }

    if (node.type === 'ObjectExpression' && objects === 'on') {
      const fallback = (): Doc => original.print(path, options, print, args)
      return printObjectHugged({ path, options, print, fallback })
    }

    if (node.type === 'CallExpression') {
      const fallback = (): Doc => original.print(path, options, print, args)
      return printCallHugged({
        path,
        options,
        print,
        fallback,
        callScope,
        allowlist,
      })
    }

    return original.print(path, options, print, args)
  },
}

const options: { [name: string]: SupportOption } = {
  foldkitViewCallees: {
    type: 'string',
    default: VIEW_DSL_CALLEES_DEFAULT,
    category: 'Foldkit',
    description:
      'Comma-separated list of function names treated as view-DSL callees when foldkitViewCallScope=allowlist.',
  },
  foldkitViewCallScope: {
    type: 'choice',
    default: 'all',
    choices: [
      {
        value: 'all',
        description:
          'Hug parens for every CallExpression. Maximum reformatting, default.',
      },
      {
        value: 'allowlist',
        description: 'Hug parens only for calls to known view-DSL identifiers.',
      },
    ],
    category: 'Foldkit',
    description: 'Scope of CallExpression hugging.',
  },
  foldkitViewArrays: {
    type: 'choice',
    default: 'on',
    choices: [
      {
        value: 'on',
        description: 'Hug brackets for ArrayExpression (default).',
      },
      {
        value: 'off',
        description: 'Leave ArrayExpression formatting untouched.',
      },
    ],
    category: 'Foldkit',
    description: 'Whether to override ArrayExpression formatting.',
  },
  foldkitViewObjects: {
    type: 'choice',
    default: 'on',
    choices: [
      {
        value: 'on',
        description: 'Hug braces for ObjectExpression (default).',
      },
      {
        value: 'off',
        description: 'Leave ObjectExpression formatting untouched.',
      },
    ],
    category: 'Foldkit',
    description: 'Whether to override ObjectExpression formatting.',
  },
}

const plugin: Plugin = {
  printers: {
    estree: wrappedEstree,
  },
  options,
}

export default plugin
