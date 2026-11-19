type RenderedApplication = Readonly<{
  html: string
  title: string
  lang?: string
  dir?: 'ltr' | 'rtl' | 'auto'
  colorScheme?: string
  canonical?: string
  ogUrl?: string
}>
