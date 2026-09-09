import { BASE_URL } from '../playwright.config'

// NOTE: the first HTML request pays the dev SSR cold start (loading the
// server entry plus the API reference and example source data), which can
// exceed a single test's timeout. Rendering one page here warms that path
// after the web server is ready and before any test starts.
const globalSetup = async (): Promise<void> => {
  await fetch(`${BASE_URL}/`, { headers: { accept: 'text/html' } })
}

export default globalSetup
