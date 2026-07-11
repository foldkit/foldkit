import path from 'path'

/** Vite resolve aliases that point foldkit subpath imports at the local source. */
export const foldkitAliases = (dirname: string) => ({
  'foldkit/asyncData': path.resolve(
    dirname,
    '../../packages/foldkit/src/asyncData/public',
  ),
  'foldkit/calendar': path.resolve(
    dirname,
    '../../packages/foldkit/src/calendar',
  ),
  'foldkit/canvas': path.resolve(dirname, '../../packages/foldkit/src/canvas'),
  'foldkit/command': path.resolve(
    dirname,
    '../../packages/foldkit/src/command',
  ),
  'foldkit/customElement': path.resolve(
    dirname,
    '../../packages/foldkit/src/customElement',
  ),
  'foldkit/devtools-host': path.resolve(
    dirname,
    '../../packages/foldkit/src/devTools/host',
  ),
  'foldkit/dom': path.resolve(dirname, '../../packages/foldkit/src/dom'),
  'foldkit/experimental/machine': path.resolve(
    dirname,
    '../../packages/foldkit/src/experimental/machine',
  ),
  'foldkit/experimental': path.resolve(
    dirname,
    '../../packages/foldkit/src/experimental',
  ),
  'foldkit/fieldValidation': path.resolve(
    dirname,
    '../../packages/foldkit/src/fieldValidation',
  ),
  'foldkit/file': path.resolve(dirname, '../../packages/foldkit/src/file'),
  'foldkit/html': path.resolve(dirname, '../../packages/foldkit/src/html'),
  'foldkit/http': path.resolve(dirname, '../../packages/foldkit/src/http'),
  'foldkit/managedResource': path.resolve(
    dirname,
    '../../packages/foldkit/src/managedResource',
  ),
  'foldkit/message': path.resolve(
    dirname,
    '../../packages/foldkit/src/message',
  ),
  'foldkit/mount': path.resolve(dirname, '../../packages/foldkit/src/mount'),
  'foldkit/navigation': path.resolve(
    dirname,
    '../../packages/foldkit/src/navigation',
  ),
  'foldkit/render': path.resolve(dirname, '../../packages/foldkit/src/render'),
  'foldkit/route': path.resolve(dirname, '../../packages/foldkit/src/route'),
  'foldkit/runtime': path.resolve(
    dirname,
    '../../packages/foldkit/src/runtime',
  ),
  'foldkit/scene': path.resolve(
    dirname,
    '../../packages/foldkit/src/test/scene',
  ),
  'foldkit/schema': path.resolve(dirname, '../../packages/foldkit/src/schema'),
  'foldkit/story': path.resolve(
    dirname,
    '../../packages/foldkit/src/test/story',
  ),
  'foldkit/struct': path.resolve(dirname, '../../packages/foldkit/src/struct'),
  'foldkit/submodel': path.resolve(
    dirname,
    '../../packages/foldkit/src/submodel/public',
  ),
  'foldkit/subscription': path.resolve(
    dirname,
    '../../packages/foldkit/src/subscription/public',
  ),
  'foldkit/test/vitest': path.resolve(
    dirname,
    '../../packages/foldkit/src/test/vitest',
  ),
  'foldkit/update': path.resolve(
    dirname,
    '../../packages/foldkit/src/update/public',
  ),
  'foldkit/url': path.resolve(dirname, '../../packages/foldkit/src/url'),
  '@foldkit/ui/animation': path.resolve(
    dirname,
    '../../packages/ui/src/animation/public',
  ),
  '@foldkit/ui/button': path.resolve(
    dirname,
    '../../packages/ui/src/button/public',
  ),
  '@foldkit/ui/calendar': path.resolve(
    dirname,
    '../../packages/ui/src/calendar/public',
  ),
  '@foldkit/ui/checkbox': path.resolve(
    dirname,
    '../../packages/ui/src/checkbox/public',
  ),
  '@foldkit/ui/combobox': path.resolve(
    dirname,
    '../../packages/ui/src/combobox/public',
  ),
  '@foldkit/ui/datePicker': path.resolve(
    dirname,
    '../../packages/ui/src/datePicker/public',
  ),
  '@foldkit/ui/dialog': path.resolve(
    dirname,
    '../../packages/ui/src/dialog/public',
  ),
  '@foldkit/ui/disclosure': path.resolve(
    dirname,
    '../../packages/ui/src/disclosure/public',
  ),
  '@foldkit/ui/dragAndDrop': path.resolve(
    dirname,
    '../../packages/ui/src/dragAndDrop/public',
  ),
  '@foldkit/ui/fieldset': path.resolve(
    dirname,
    '../../packages/ui/src/fieldset/public',
  ),
  '@foldkit/ui/fileDrop': path.resolve(
    dirname,
    '../../packages/ui/src/fileDrop/public',
  ),
  '@foldkit/ui/input': path.resolve(
    dirname,
    '../../packages/ui/src/input/public',
  ),
  '@foldkit/ui/listbox': path.resolve(
    dirname,
    '../../packages/ui/src/listbox/public',
  ),
  '@foldkit/ui/menu': path.resolve(
    dirname,
    '../../packages/ui/src/menu/public',
  ),
  '@foldkit/ui/popover': path.resolve(
    dirname,
    '../../packages/ui/src/popover/public',
  ),
  '@foldkit/ui/radioGroup': path.resolve(
    dirname,
    '../../packages/ui/src/radioGroup/public',
  ),
  '@foldkit/ui/select': path.resolve(
    dirname,
    '../../packages/ui/src/select/public',
  ),
  '@foldkit/ui/slider': path.resolve(
    dirname,
    '../../packages/ui/src/slider/public',
  ),
  '@foldkit/ui/switch': path.resolve(
    dirname,
    '../../packages/ui/src/switch/public',
  ),
  '@foldkit/ui/tabs': path.resolve(
    dirname,
    '../../packages/ui/src/tabs/public',
  ),
  '@foldkit/ui/textarea': path.resolve(
    dirname,
    '../../packages/ui/src/textarea/public',
  ),
  '@foldkit/ui/toast': path.resolve(
    dirname,
    '../../packages/ui/src/toast/public',
  ),
  '@foldkit/ui/tooltip': path.resolve(
    dirname,
    '../../packages/ui/src/tooltip/public',
  ),
  '@foldkit/ui/virtualList': path.resolve(
    dirname,
    '../../packages/ui/src/virtualList/public',
  ),
  '@foldkit/ui': path.resolve(dirname, '../../packages/ui/src/index'),
  '@foldkit/devtools': path.resolve(
    dirname,
    '../../packages/devtools/src/index',
  ),
  foldkit: path.resolve(dirname, '../../packages/foldkit/src/index'),
})
