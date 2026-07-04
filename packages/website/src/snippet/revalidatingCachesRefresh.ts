import { Update } from 'foldkit'

// each refresher is an update step: read one cache, maybe revalidate it
type Refresher = Update.Step<Model, Message, NotesServices>
