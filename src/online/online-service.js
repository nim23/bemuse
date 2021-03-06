
// The OnlineService module wraps the Parse API.

import { Parse } from 'parse'
import { wrapPromise, unwrapUser, toObject } from './parse-utils'

import invariant from 'invariant'

export class OnlineService {

  getCurrentUser () {
    return unwrapUser(Parse.User.current())
  }

  isLoggedIn () {
    return !!Parse.User.current()
  }

  signUp ({ username, password, email }) {
    invariant(typeof username === 'string', 'username must be a string')
    invariant(typeof password === 'string', 'password must be a string')
    invariant(typeof email === 'string',    'email must be a string')
    return wrapPromise(Parse.User.signUp(username, password, { email })).then(unwrapUser)
  }

  logIn ({ username, password }) {
    invariant(typeof username === 'string', 'username must be a string')
    invariant(typeof password === 'string', 'password must be a string')
    return wrapPromise(Parse.User.logIn(username, password)).then(unwrapUser)
  }

  logOut () {
    return wrapPromise(Parse.User.logOut()).then(() => null)
  }

  submitScore (info) {
    return (
      wrapPromise(Parse.Cloud.run('submitScore', info))
      .then(({ data, meta: { rank } }) => {
        return Object.assign(toObject(data), { rank })
      })
    )
  }

  _setQueryUser (query, user) {
    if (user) {
      let parseUser = new Parse.User()
      parseUser.id = user.id
      query.equalTo('user', parseUser)
    } else {
      query.equalTo('user', Parse.User.current())
    }
  }

  // Retrieves the record.
  //
  // Returns a {Parse.Object}.
  _retrieveRecord ({ md5, playMode }, user) {
    let query = new Parse.Query('GameScore')
    query.equalTo('md5',      md5)
    query.equalTo('playMode', playMode)
    this._setQueryUser(query, user)
    return wrapPromise(query.first())
  }

  // Retrieves the rank.
  //
  // Returns a {Number} representing rank.
  _retrieveRank ({ md5, playMode }, score) {
    let countQuery = new Parse.Query('GameScore')
    countQuery.equalTo('md5', md5)
    countQuery.equalTo('playMode', playMode)
    countQuery.greaterThan('score', score)
    return wrapPromise(countQuery.count()).then(x => x + 1, () => null)
  }

  // Retrieves a record.
  //
  // Returns a record object.
  retrieveRecord (level, user) {
    return (this._retrieveRecord(level, user)
      .then(record => {
        if (record) {
          return (this._retrieveRank(level, record.get('score'))
            .then(rank => Object.assign(toObject(record), { rank }))
          )
        } else {
          return null
        }
      })
    )
  }

  // Retrieves the scoreboard
  retrieveScoreboard ({ md5, playMode }) {
    var query = new Parse.Query('GameScore')
    query.equalTo('md5', md5)
    query.equalTo('playMode', playMode)
    query.descending('score')
    query.limit(100)
    return wrapPromise(query.find()).then(results => ({
      data: results.map((record, index) =>
        Object.assign(toObject(record), { rank: index + 1 })
      )
    }))
  }

  // Retrieve multiple records!
  retrieveMultipleRecords (items, user) {
    let query = new Parse.Query('GameScore')
    query.containedIn('md5', items.map(item => item.md5))
    this._setQueryUser(query, user)
    query.limit(1000)
    return (wrapPromise(query.find())
      .then(results => results.map(toObject))
    )
  }

}

export default OnlineService
