import { resolveFamily } from 'foldkit/internal/block'

import {
  Definition,
  Family,
  Model,
  Resolved,
  build,
} from './family-layer-members.accepted.js'

// @ts-expect-error The ready Instance Schema cannot be replaced by a convenience.
resolveFamily(Definition, Family, build, { members: { Instance: Model } })

// @ts-expect-error The family facade does not publish an implementation getter.
Resolved.get
