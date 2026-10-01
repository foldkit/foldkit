import { setup } from 'foldkit/test/bun'

import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register({ url: 'http://localhost:3000' })
setup()
