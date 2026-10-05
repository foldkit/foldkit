import headScript from './head-script.js?raw'
import probeScript from './probe-script.js?raw'

export const PACKED_CONSUMER_HEAD = String.raw`
<script>
${headScript}</script>`

export const PACKED_CONSUMER_PROBE = String.raw`
<script>
${probeScript}</script>`
