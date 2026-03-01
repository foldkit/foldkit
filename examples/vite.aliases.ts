import path from 'path'

/** Vite resolve aliases that point foldkit subpath imports at the local source. */
export const foldkitAliases = (dirname: string) => ({
  'foldkit/command': path.resolve(
    dirname,
    '../../packages/foldkit/src/command',
  ),
  'foldkit/fieldValidation': path.resolve(
    dirname,
    '../../packages/foldkit/src/fieldValidation',
  ),
  'foldkit/html': path.resolve(dirname, '../../packages/foldkit/src/html'),
  'foldkit/managedResource': path.resolve(
    dirname,
    '../../packages/foldkit/src/managedResource',
  ),
  'foldkit/message': path.resolve(
    dirname,
    '../../packages/foldkit/src/message',
  ),
  'foldkit/navigation': path.resolve(
    dirname,
    '../../packages/foldkit/src/navigation',
  ),
  'foldkit/route': path.resolve(dirname, '../../packages/foldkit/src/route'),
  'foldkit/runtime': path.resolve(
    dirname,
    '../../packages/foldkit/src/runtime',
  ),
  'foldkit/schema': path.resolve(dirname, '../../packages/foldkit/src/schema'),
  'foldkit/struct': path.resolve(dirname, '../../packages/foldkit/src/struct'),
  'foldkit/subscription': path.resolve(
    dirname,
    '../../packages/foldkit/src/subscription',
  ),
  'foldkit/task': path.resolve(dirname, '../../packages/foldkit/src/task'),
  'foldkit/ui/dialog': path.resolve(
    dirname,
    '../../packages/foldkit/src/ui/dialog',
  ),
  'foldkit/ui/disclosure': path.resolve(
    dirname,
    '../../packages/foldkit/src/ui/disclosure',
  ),
  'foldkit/ui/listbox': path.resolve(
    dirname,
    '../../packages/foldkit/src/ui/listbox',
  ),
  'foldkit/ui/menu': path.resolve(
    dirname,
    '../../packages/foldkit/src/ui/menu',
  ),
  'foldkit/ui/tabs': path.resolve(
    dirname,
    '../../packages/foldkit/src/ui/tabs',
  ),
  'foldkit/ui': path.resolve(dirname, '../../packages/foldkit/src/ui'),
  'foldkit/url': path.resolve(dirname, '../../packages/foldkit/src/url'),
  foldkit: path.resolve(dirname, '../../packages/foldkit/src/index'),
})
