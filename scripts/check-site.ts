import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { checkSite } from '../lib/site-check.ts'

const dir = process.argv[2]
const site = JSON.parse(await readFile('src/_data/site.json', 'utf8'))

const { errors, warnings } = await checkSite(dir, {
  env: process.env,
  privateTermsPath: resolve('.private-terms'),
  contactEmail: site.contactEmail
})

for (const { file, message } of errors) {
  console.error(`${file}: ${message}`)
}
for (const warning of warnings) {
  console.error(warning)
}

process.exit(errors.length > 0 ? 1 : 0)
