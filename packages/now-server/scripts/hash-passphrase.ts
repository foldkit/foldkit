import { hash } from '@node-rs/argon2'
import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'

const MIN_PASSPHRASE_LENGTH = 16

const main = async (): Promise<void> => {
  const rl = createInterface({ input: stdin, output: stdout })

  console.log('Hash a recovery passphrase for @foldkit/now-server.')
  console.log(`Minimum length: ${MIN_PASSPHRASE_LENGTH} characters.`)
  console.log('')

  const passphrase = await rl.question('Passphrase: ')
  const confirm = await rl.question('Confirm:    ')
  rl.close()

  if (passphrase !== confirm) {
    console.error('\nPassphrases did not match.')
    process.exit(1)
  }

  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    console.error(
      `\nPassphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters.`,
    )
    process.exit(1)
  }

  const hashed = await hash(passphrase, {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
    outputLen: 32,
  })

  console.log('\nDone. Paste the command below into your terminal:\n')
  console.log(
    `  fly secrets set NOW_ADMIN_PASSPHRASE_HASH='${hashed}' --app foldkit-now-server`,
  )
  console.log('')
  console.log(
    'Also make sure NOW_RECOVERY_PASSPHRASE_ENABLED is set to true (default).',
  )
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
