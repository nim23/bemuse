
import { Cachier } from '../../cachier'

function shouldReject(promise) {
  return Promise.resolve(promise)
  .then(
    () => { throw new Error('should not be success') },
    () => 'ok, error is thrown'
  )
}

describe('Cachier', function() {

  let cachier
  let databaseNumber = 0

  let retry = count => fn => () => {
    let run = n => {
      let promise = Promise.resolve().then(fn)
      return n >= count ? promise : promise.catch(() => run(n + 1))
    }
    return run(1)
  }

  beforeEach(() =>
    cachier = new Cachier(`test.${new Date().getTime()}.${++databaseNumber}`))
  afterEach(retry(2)(() =>
    cachier.destroyDatabase()))

  describe('.connection', () => {
    it('should be a promise which fullfill with the db connection', () => {
      return cachier.connection.then(function(db) {
        expect(db.constructor + '').toMatch(/DBDatabase/)
      })
    })
  })

  describe('#save', () => {
    it('stores a blob', () => {
      let blob = new Blob(['hello'])
      return cachier.save('wow', blob)
        .then(result => expect(result).toBeTruthy())
    })
    it('rejects when key is invalid', () => {
      let blob = new Blob(['hello'])
      return shouldReject(cachier.save(undefined, blob))
    })
  })

  describe('with a blob saved', () => {

    beforeEach(() => {
      let blob = new Blob(['hello'])
      return cachier.save('wow2', blob, { name: 'example1' }).delay(10)
    })

    describe('#load', function() {
      it('should return the blob value', () => {
        return cachier.load('wow2').then(function({ blob, metadata }) {
          expect(blob.size).toBe(5)
          expect(metadata).toEqual({ name: 'example1' })
        })
      })
    })

    describe('#save', function() {
      it('should replace content with a new blob', () => {
        let blob2 = new Blob(['world!'])
        return cachier.save('wow2', blob2)
          .delay(10) // chrome needs this delay
          .then(() => cachier.load('wow2'))
          .then(function({ blob, metadata }) {
            expect(blob.size).toBe(6)
            expect(metadata).toBe(undefined)
          })
      })
    })

    describe('#delete', function() {
      it('should remove the blob', () => {
        return shouldReject(cachier.delete('wow3')
          .then(() => cachier.load('wow3')))
      })
    })

  })

  describe('#destroyDatabase', function() {
    it('may be called twice', () => {
      return cachier.destroyDatabase()
    })
  })

  describe('without blob support in IndexedDB', () => {
    it('still works', () => {
      let blob = new Blob(['hello'], { type: 'text/plain' })
      cachier._NO_BLOB = true
      return cachier.save('wow4', blob)
        .delay(10)
        .then(() => cachier.load('wow4'))
        .then(function({ blob }) {
          expect(blob.size).toBe(5)
          expect(blob.type).toBe('text/plain')
        })
    })
  })

})