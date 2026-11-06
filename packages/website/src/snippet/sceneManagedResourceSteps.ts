import { Scene } from 'foldkit'

// The test declares the lifecycle outcome, the way Command.resolve declares
// a Command result. acquire takes exactly the arguments the entry's
// onAcquired declares (here the acquired socket value; none for a handler
// that ignores it) and requires the current Model to request the resource,
// so drive that transition through real steps first.
Scene.click(Scene.role('button', { name: 'Open feed' }))
Scene.ManagedResource.acquire(resources.feedSocket, { socketId: 'sock-1' })
Scene.expect(Scene.role('status')).toHaveText('Connected')

// release requires the Model to no longer request the resource, mirroring
// the runtime's Some to None transition.
Scene.click(Scene.role('button', { name: 'Close feed' }))
Scene.ManagedResource.release(resources.feedSocket)

// failAcquire feeds onAcquireError through update. It runs under the same
// gate as acquire: the Model must request the resource.
Scene.click(Scene.role('button', { name: 'Open feed' }))
Scene.ManagedResource.failAcquire(resources.feedSocket, new Error('offline'))
