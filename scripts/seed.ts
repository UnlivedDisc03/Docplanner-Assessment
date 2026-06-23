import { spawn } from 'node:child_process'
import { createReadStream, statSync } from 'node:fs'
import { resolve } from 'node:path'

const CONTAINER = process.env.MYSQL_CONTAINER ?? 'real-estate-portal-mysql-1'
const SEED_PATH = resolve(__dirname, '..', 'prisma', 'seed.sql')

statSync(SEED_PATH)
console.log(`Restoring ${SEED_PATH} into container "${CONTAINER}"...`)

const proc = spawn(
  'docker',
  ['exec', '-i', CONTAINER, 'mysql', '-uroot', '-proot', 'realestate'],
  { stdio: ['pipe', 'inherit', 'inherit'] },
)

createReadStream(SEED_PATH).pipe(proc.stdin)

proc.on('exit', code => {
  if (code === 0) console.log('Seed complete.')
  else console.error(`Seed failed with exit code ${code}.`)
  process.exit(code ?? 1)
})
