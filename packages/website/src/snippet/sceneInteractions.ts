import { Scene } from 'foldkit'

Scene.click(Scene.role('button', { name: 'Log out' }))
Scene.doubleClick(Scene.role('button', { name: 'Expand' }))
Scene.hover(Scene.role('menuitem', { name: 'File' }))
Scene.focus(Scene.label('Email'))
Scene.blur(Scene.label('Email'))
Scene.type(Scene.label('Email'), 'alice@example.com')
Scene.change(Scene.label('Country'), 'US')
Scene.submit(Scene.role('form'))
Scene.keydown(Scene.label('Search'), 'Enter')
