import fs from 'node:fs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'))
assert.equal(lock.version, pkg.version)
assert.equal(lock.packages[''].version, pkg.version)
assert.deepEqual(lock.packages[''].engines, pkg.engines)
assert.ok(pkg.engines?.dsh)
assert.ok(fs.readFileSync('CHANGELOG.md', 'utf8').includes(`## ${pkg.version}`))
for (const name of fs.readdirSync('.').filter(name => name.endsWith('.md'))) {
  for (const match of fs.readFileSync(name, 'utf8').matchAll(/\]\((\.\/[^)#\s]+)/g)) {
    assert.ok(fs.existsSync(match[1]), `${name}: missing ${match[1]}`)
  }
}
const [pack] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts', '--loglevel=error'], { encoding: 'utf8' }))
assert.equal(pack.version, pkg.version)
const files = new Set(pack.files.map(file => file.path))
for (const name of ['package.json', 'index.js', 'client.js', 'cordis.patch.yml', 'icon.svg', 'LICENSE', 'README.md', 'README.zh-CN.md', 'MARKET-INDEX.md', 'CHANGELOG.md', 'RELEASE.md', ...['en','zh','de','es','fr','ja','pt','ru'].map(id => `locale/${id}.json`)]) assert.ok(files.has(name), `Missing from package: ${name}`)
for (const name of files) assert.ok(!/^(?:node_modules|test|scripts|\.github)\//.test(name), `Development file in package: ${name}`)
console.log(`Package ${pkg.name}@${pkg.version}: ${files.size} files, ${pack.size} bytes. Versions, links and contents passed.`)
