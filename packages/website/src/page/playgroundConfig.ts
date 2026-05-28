import type { EmbedOptions } from '@stackblitz/sdk'

export const stackBlitzPlaygroundEmbedOptions = {
  height: '100%',
  crossOriginIsolated: true,
  hideNavigation: true,
  openFile: 'src/main.ts',
  showSidebar: true,
  view: 'default',
} as const satisfies EmbedOptions
