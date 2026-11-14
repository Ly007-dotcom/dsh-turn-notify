import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import test from 'node:test'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'

const source = fs.readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const storageKey = 'dsh-turn-notify:enabled'
const makeStorage = () => {
  const values = new Map()
  return { values, get length() { return values.size }, key: i => [...values.keys()][i], removeItem: key => values.delete(key), getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
}

function client({ permission = 'granted', storage = makeStorage(), summary = {}, start = 100000, indexedDB = new IDBFactory(), requestPermission } = {}) {
  let clock = start
  let timerId = 0
  let plugin
  let snapshot = new Map([['s1', { running: true }]])
  const summaries = { s1: { title: 'Example session', updatedAt: 100, ...summary } }
  const timers = new Map()
  const listeners = new Set()
  const components = new Map()
  const cleanup = []
  const notices = []
  const navigation = []
  const audio = { count: 0 }
  let dict
  class Notification {
    static permission = permission
    static async requestPermission() { const value = requestPermission ? await requestPermission() : permission; Notification.permission = value; return value }
    constructor(title, options) { this.title = title; this.options = options; notices.push(this) }
    close() {}
  }
  class AudioContext {
    constructor() { audio.count++; this.state = 'running'; this.currentTime = 0 }
    close() { return Promise.resolve() }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} } }
    createOscillator() { return { frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} } }
  }
  const React = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect: () => {},
  }
  const events = new Map()
  const context = {
    indexedDB, IDBKeyRange,
    addEventListener: (name, fn) => events.set(name, fn),
    removeEventListener: name => events.delete(name),
    console: { warn() {} },
    window: { __ModuleLoader__: { load: definition => { plugin = definition.factory(() => React) } } },
    localStorage: storage,
    Notification: permission === 'unsupported' ? undefined : Notification,
    AudioContext,
    Date: class extends Date { static now() { return clock } },
    setTimeout: (fn, delay) => { timers.set(++timerId, { fn, due: clock + delay }); return timerId },
    clearTimeout: id => timers.delete(id),
    focus() {},
  }
  vm.runInNewContext(source, context, { filename: 'client.js' })
  const ctx = {
    locale: {
      register: (_ns, dictionaries) => { dict = dictionaries; return () => {} },
      bind: () => key => dict.en[key] ?? key,
    },
    effect: fn => { const dispose = fn(); if (dispose) cleanup.push(dispose) },
    uiSession: { sessionStatus: { getSnapshot: () => snapshot, subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn) } } },
    sessions: { list: { getSnapshot: () => ({ byId: summaries }) } },
    uiWorkspace: { openSession: id => navigation.push(id) },
    slots: {
      inject: (_name, fn) => fn(),
      register: (info, component) => { components.set(info.id, component); return () => components.delete(info.id) },
    },
  }
  plugin.apply(ctx)
  return {
    notices, audio, storage, navigation, indexedDB,
    storageChanged: key => events.get('storage')?.({ key }),
    summary: value => Object.assign(summaries.s1, value),
    render: id => components.get(id)({ t: key => dict.en[key] ?? key }),
    status(value) { snapshot = new Map([['s1', value]]); for (const fn of listeners) fn() },
    advance(ms) {
      const target = clock + ms
      while (true) {
        const next = [...timers].filter(([, t]) => t.due <= target).sort((a, b) => a[1].due - b[1].due)[0]
        if (!next) break
        clock = next[1].due
        timers.delete(next[0])
        next[1].fn()
      }
      clock = target
    },
    stop() { for (const fn of cleanup.splice(0).reverse()) fn() },
    reapply() { plugin.apply(ctx) },
    timerCount: () => timers.size,
  }
}
function find(node, test) {
  if (!node || typeof node !== 'object') return undefined
  if (test(node)) return node
  for (const child of node.children ?? []) { const match = find(child, test); if (match) return match }
}

const settle = async () => { for (let i = 0; i < 40; i++) await new Promise(resolve => setImmediate(resolve)) }
const switchOf = c => find(c.render('turn-notify'), n => n.props.role === 'switch')
const toastOf = c => c.render('turn-notify-toast')
const finish = c => { c.status({ running: false }); c.advance(1800) }
async function records(indexedDB) {
  const request = indexedDB.open('dsh-turn-notify', 1)
  const db = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
  const get = db.transaction('claims').objectStore('claims').getAll()
  const values = await new Promise(resolve => { get.onsuccess = () => resolve(get.result) })
  db.close()
  return values
}

for (const permission of ['granted', 'denied', 'default', 'unsupported']) {
  test(`master switch works with ${permission} permission`, async () => {
    const c = client({ permission })
    assert.equal(switchOf(c).props['aria-checked'], 'true')
    assert.ok(!switchOf(c).props.disabled)
    switchOf(c).props.onClick()
    assert.equal(switchOf(c).props['aria-checked'], 'false')
    finish(c); await settle()
    assert.equal(toastOf(c), null); assert.equal(c.audio.count, 0); assert.equal(c.notices.length, 0)
    switchOf(c).props.onClick()
    c.summary({ updatedAt: 200 }); c.status({ running: true }); finish(c); await settle()
    assert.ok(toastOf(c)); assert.equal(c.audio.count, 1)
    assert.equal(c.notices.length, permission === 'granted' ? 1 : 0)
    c.stop()
  })
}

test('stored preference survives reload and propagates to another window', async () => {
  const storage = makeStorage()
  const a = client({ storage }), b = client({ storage })
  switchOf(a).props.onClick(); b.storageChanged(storageKey)
  assert.equal(switchOf(b).props['aria-checked'], 'false')
  const reloaded = client({ storage })
  assert.equal(switchOf(reloaded).props['aria-checked'], 'false')
  finish(b); await settle(); assert.equal(b.notices.length, 0)
  a.stop(); b.stop(); reloaded.stop()
})

test('storage errors still allow disabling all reminders in memory', async () => {
  const storage = { getItem() { throw Error('denied') }, setItem() { throw Error('quota') } }
  const c = client({ storage })
  switchOf(c).props.onClick(); finish(c); await settle()
  assert.equal(switchOf(c).props['aria-checked'], 'false')
  assert.equal(toastOf(c), null); assert.equal(c.audio.count, 0)
  c.stop()
})

test('turning off while permission dialog is open does not re-enable reminders', async () => {
  let answer
  const c = client({ permission: 'default', requestPermission: () => new Promise(resolve => { answer = resolve }) })
  const button = find(c.render('turn-notify'), n => n.type === 'button' && n.children[0] === 'Allow system notifications')
  button.props.onClick(); switchOf(c).props.onClick(); answer('granted'); await settle()
  assert.equal(switchOf(c).props['aria-checked'], 'false'); assert.equal(toastOf(c), null)
  assert.equal(c.notices.length, 0); c.stop()
})

test('test action works without system permission and master off removes it', async () => {
  const c = client({ permission: 'denied' })
  const button = find(c.render('turn-notify'), n => n.children?.[0] === 'Send a test notification')
  button.props.onClick(); assert.ok(toastOf(c))
  switchOf(c).props.onClick(); assert.equal(toastOf(c), null)
  assert.equal(find(c.render('turn-notify'), n => n.children?.[0] === 'Send a test notification'), undefined)
  c.stop()
})

test('same-origin windows compete atomically for one event', async () => {
  const indexedDB = new IDBFactory()
  const clients = Array.from({ length: 12 }, () => client({ indexedDB }))
  clients.forEach(finish); await settle()
  assert.equal(clients.reduce((n, c) => n + c.notices.length, 0), 1)
  assert.equal((await records(indexedDB)).length, 1)
  clients.forEach(c => c.stop())
})

test('six-second delay and a window reload do not duplicate the event', async () => {
  const indexedDB = new IDBFactory()
  const a = client({ indexedDB }); finish(a); await settle(); a.stop()
  const b = client({ indexedDB, start: 106000 }); finish(b); await settle()
  assert.equal(a.notices.length, 1); assert.equal(b.notices.length, 0)
  b.stop()
})

test('expiry removes old records and permits a new claim', async () => {
  const indexedDB = new IDBFactory()
  const a = client({ indexedDB }); finish(a); await settle(); a.stop()
  const b = client({ indexedDB, start: 100000 + 86400000 + 2000 }); await settle()
  assert.equal((await records(indexedDB)).length, 0)
  finish(b); await settle(); assert.equal(b.notices.length, 1); b.stop()
})

test('new turn and different approval keys are distinct events', async () => {
  const c = client(); finish(c); await settle()
  c.status({ running: true }); c.summary({ updatedAt: 200 }); finish(c); await settle()
  c.status({ running: false, pendingInteraction: { key: 'approval-1' } }); await settle()
  c.status({ running: false, pendingInteraction: { key: 'approval-2' } }); await settle()
  assert.equal(c.notices.length, 4); c.stop()
})

test('approval is immediate and suppresses completion', async () => {
  const c = client(); c.status({ running: false, pendingInteraction: { key: 'approval-1' } }); await settle()
  assert.equal(c.notices.length, 1); c.advance(2000); await settle()
  assert.equal(c.notices.length, 1); c.stop()
})

test('debounce, resume, subagent and blank filtering remain intact', async () => {
  const c = client(); c.status({ running: false }); c.advance(1000); c.status({ running: true }); c.advance(2000)
  await settle(); assert.equal(c.notices.length, 0); c.stop()
  for (const summary of [{ origin: 'subagent' }, { blank: true }]) {
    const filtered = client({ summary }); finish(filtered); await settle()
    assert.equal(filtered.notices.length, 0); filtered.stop()
  }
})

test('click notification opens the session', async () => {
  const c = client(); finish(c); await settle(); c.notices[0].onclick()
  assert.deepEqual(c.navigation, ['s1']); c.stop()
})

test('pending async claim cannot notify after disable or disposal', async () => {
  for (const action of [c => switchOf(c).props.onClick(), c => c.stop(), c => c.status({ running: true })]) {
    const c = client(); finish(c); action(c); await settle()
    assert.equal(c.notices.length, 0); assert.equal(toastOf(c), null)
    c.stop()
  }
})

test('cleanup cancels toast timer and removes legacy claim keys', async () => {
  const storage = makeStorage(); storage.setItem('dsh-turn-notify:claim:old', '123'); storage.setItem('unrelated', 'keep')
  const c = client({ storage }); finish(c); await settle(); c.stop()
  assert.equal(c.timerCount(), 0); assert.equal(storage.getItem('dsh-turn-notify:claim:old'), null)
  assert.equal(storage.getItem('unrelated'), 'keep')
})

test('unavailable IndexedDB falls back to local deduplication', async () => {
  const fallback = client({ indexedDB: null }); finish(fallback); await settle()
  fallback.status({ running: true }); finish(fallback); await settle()
  assert.equal(fallback.notices.length, 1); fallback.stop()
})


test('disable and re-enable reopens shared storage rather than falling back locally', async () => {
  const indexedDB = new IDBFactory()
  const a = client({ indexedDB }); finish(a); await settle(); a.stop(); a.reapply()
  a.summary({ updatedAt: 200 }); a.status({ running: true })
  const b = client({ indexedDB, summary: { updatedAt: 200 } })
  finish(a); finish(b); await settle()
  assert.equal(a.notices.length + b.notices.length, 2)
  a.stop(); b.stop()
})


test('permission result arriving after plugin disposal cannot deliver a test notice', async () => {
  let answer
  const c = client({ permission: 'default', requestPermission: () => new Promise(resolve => { answer = resolve }) })
  find(c.render('turn-notify'), n => n.type === 'button' && n.children[0] === 'Allow system notifications').props.onClick()
  c.stop(); c.reapply(); answer('granted'); await settle()
  assert.equal(c.notices.length, 0); assert.equal(c.audio.count, 0); c.stop()
})
