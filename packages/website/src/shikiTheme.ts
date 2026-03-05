import type { ThemeRegistration } from 'shiki'

/** Custom Shiki theme using 0x96f terminal colors. */
export const shikiTheme: ThemeRegistration = {
  name: '0x96f',
  type: 'dark',
  colors: {
    'editor.background': '#1c1a20',
    'editor.foreground': '#E0DEE6',
  },
  tokenColors: [
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: '#8A869C' },
    },
    {
      scope: ['keyword', 'storage', 'storage.type'],
      settings: { foreground: '#FF7272' },
    },
    {
      scope: ['keyword.control.import', 'keyword.control.from'],
      settings: { foreground: '#FF7272' },
    },
    {
      scope: ['string', 'punctuation.definition.string'],
      settings: { foreground: '#BCDF59' },
    },
    {
      scope: [
        'constant',
        'constant.numeric',
        'variable.language',
        'support.constant',
      ],
      settings: { foreground: '#49CAE4' },
    },
    {
      scope: [
        'entity.name',
        'entity.name.function',
        'support.function',
      ],
      settings: { foreground: '#A093E2' },
    },
    {
      scope: ['variable.parameter', 'variable.other'],
      settings: { foreground: '#FFCA58' },
    },
    {
      scope: ['entity.name.type', 'support.type', 'support.class'],
      settings: { foreground: '#49CAE4' },
    },
    {
      scope: ['entity.name.tag'],
      settings: { foreground: '#BCDF59' },
    },
    {
      scope: ['entity.other.attribute-name'],
      settings: { foreground: '#FFCA58' },
    },
    {
      scope: ['punctuation', 'keyword.operator'],
      settings: { foreground: '#9E9BAA' },
    },
    {
      scope: ['variable.other.property'],
      settings: { foreground: '#E0DEE6' },
    },
  ],
}
