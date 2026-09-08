import {
  blur,
  change,
  click,
  contextMenu,
  doubleClick,
  focus,
  hover,
  keydown,
  label,
  pointerDown,
  pointerUp,
  role,
  submit,
  type,
} from 'foldkit/scene'

click(role('button', { name: 'Log out' }))
doubleClick(role('button', { name: 'Expand' }))
contextMenu(role('row', { name: 'Quarterly report' }))
pointerDown(role('button', { name: 'Toggle' }))
pointerUp(role('button', { name: 'Toggle' }))
hover(role('menuitem', { name: 'File' }))
focus(label('Email'))
blur(label('Email'))
type(label('Email'), 'alice@example.com')
change(label('Country'), 'US')
submit(role('form'))
keydown(label('Search'), 'Enter')
