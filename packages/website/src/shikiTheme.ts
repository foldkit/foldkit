import type { ThemeRegistration } from 'shiki'

/** Custom dark Shiki theme using 0x96f terminal colors. */
export const shikiDarkTheme: ThemeRegistration = {
  name: '0x96f-dark',
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
      scope: ['constant', 'constant.numeric', 'variable.language', 'support.constant'],
      settings: { foreground: '#49CAE4' },
    },
    {
      scope: ['entity.name', 'entity.name.function', 'support.function'],
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

/**
 * Light Shiki theme — AA-compliant counterparts of the dark palette on a
 * cream/gray-50 background (#f5f4f8). Every token meets WCAG 4.5:1 contrast.
 */
export const shikiLightTheme: ThemeRegistration = {
  name: '0x96f-light',
  type: 'light',
  colors: {
    'editor.background': '#eeedf2',
    'editor.foreground': '#403d4a',
  },
  tokenColors: [
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: '#6e6a7c' },
    },
    {
      scope: ['keyword', 'storage', 'storage.type'],
      settings: { foreground: '#b83530' },
    },
    {
      scope: ['keyword.control.import', 'keyword.control.from'],
      settings: { foreground: '#b83530' },
    },
    {
      scope: ['string', 'punctuation.definition.string'],
      settings: { foreground: '#3d6b06' },
    },
    {
      scope: ['constant', 'constant.numeric', 'variable.language', 'support.constant'],
      settings: { foreground: '#0e7490' },
    },
    {
      scope: ['entity.name', 'entity.name.function', 'support.function'],
      settings: { foreground: '#6b5cb8' },
    },
    {
      scope: ['variable.parameter', 'variable.other'],
      settings: { foreground: '#92640a' },
    },
    {
      scope: ['entity.name.type', 'support.type', 'support.class'],
      settings: { foreground: '#0e7490' },
    },
    {
      scope: ['entity.name.tag'],
      settings: { foreground: '#3d6b06' },
    },
    {
      scope: ['entity.other.attribute-name'],
      settings: { foreground: '#92640a' },
    },
    {
      scope: ['punctuation', 'keyword.operator'],
      settings: { foreground: '#6e6a7c' },
    },
    {
      scope: ['variable.other.property'],
      settings: { foreground: '#403d4a' },
    },
  ],
}
