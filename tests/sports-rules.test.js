import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'

let env, alice, bob, guest
const path = 'sportsRooms/abcdefghijk/messages/'
const message = (uid = 'alice', text = '같이 응원해요!') => ({ uid, name: uid, text, createdAt: serverTimestamp() })
before(async () => {
  const fragment = await readFile(new URL('./sports.rules.fragment', import.meta.url), 'utf8')
  // Existing users rule is a fixture: demonstrate fragment merging without replacing it.
  const rules = `rules_version = '2'; service cloud.firestore { match /databases/{database}/documents {
    match /users/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }
    ${fragment}
  } }`
  env = await initializeTestEnvironment({ projectId: 'demo-sports', firestore: { host: '127.0.0.1', port: 8085, rules } })
  alice = env.authenticatedContext('alice').firestore()
  bob = env.authenticatedContext('bob').firestore()
  guest = env.unauthenticatedContext().firestore()
})
after(async () => { await env?.cleanup() })

test('two authenticated clients receive messages in both directions through onSnapshot', async () => {
  async function receive(db, expectedId, write) {
    let stop
    const received = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('onSnapshot timed out')), 10000)
      stop = onSnapshot(collection(db, path), snapshot => {
        if (snapshot.docs.some(item => item.id === expectedId && !item.metadata.hasPendingWrites)) { clearTimeout(timeout); resolve(snapshot) }
      }, error => { clearTimeout(timeout); reject(error) })
    })
    try { await write(); await received } finally { stop?.() }
  }
  await receive(bob, 'from-alice', () => setDoc(doc(alice, path + 'from-alice'), message()))
  await receive(alice, 'from-bob', () => setDoc(doc(bob, path + 'from-bob'), message('bob')))
})
test('video rooms are isolated and valid authenticated reads succeed', async () => {
  const snapshot = await new Promise((resolve, reject) => {
    const stop = onSnapshot(collection(bob, 'sportsRooms/otherroom12/messages'), value => { stop(); resolve(value) }, reject)
  })
  assert.equal(snapshot.empty, true)
  await assertSucceeds(getDoc(doc(bob, path + 'from-alice')))
})
test('unauthenticated reads/writes and forged sender UID are denied', async () => {
  await assertFails(getDoc(doc(guest, path + 'from-alice')))
  await assertFails(setDoc(doc(guest, path + 'guest'), message()))
  await assertFails(setDoc(doc(bob, path + 'spoof'), message('alice')))
})
test('length, whitespace, timestamp, extra fields, malformed room and immutable messages enforced', async () => {
  for (const data of [message('alice', ''), message('alice', ' '), message('alice', 'a'.repeat(301)), { ...message(), name: 'a'.repeat(41) }, { ...message(), createdAt: new Date(0) }, { ...message(), admin: true }]) {
    await assertFails(setDoc(doc(alice, path + 'invalid'), data))
  }
  await assertSucceeds(setDoc(doc(alice, path + 'max'), message('alice', 'a'.repeat(300))))
  await assertFails(setDoc(doc(alice, 'sportsRooms/invalid/messages/test'), message()))
  await assertFails(updateDoc(doc(alice, path + 'max'), { text: '수정' }))
  await assertFails(deleteDoc(doc(alice, path + 'max')))
})
test('existing user rule remains effective after merging fragment', async () => {
  await assertSucceeds(setDoc(doc(alice, 'users/alice'), { name: 'Alice' }))
  await assertFails(getDoc(doc(bob, 'users/alice')))
})
