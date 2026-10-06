import { message } from './shared'
import './styles.css'

document.body.dataset['message'] = message
document.body.addEventListener('click', () => import('./lazy'))
