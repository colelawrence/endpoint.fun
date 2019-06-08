
import { Express } from 'express'
import { Connection } from 'typeorm'

import { TokenRepo } from '../token'

export function addTokenRoutes(app: Express, conn: Connection) {
  const tokens = new TokenRepo(conn)

  app.get('/check-usage', (req, res) => {
    res.render('check-usage', { title: 'Endpoint.fun / Check usage' })
  })

  app.get('/revoke', (req, res) => {
    res.render('revoke', { title: 'Endpoint.fun / Revoke token' })
  })

  app.get('/new-token', (req, res) => {
    res.render('new-token', { title: 'Endpoint.fun / New token' })
  })

  app.post('/revoke', (req, res) => {
    tokens.revokeToken(req.body['token']).then((token) => {
      console.log("Token revoked", token)
      res.redirect('/?from=revoked')
    }).catch((err) => {
      console.error("Token failed to be revoked", err)
      res.render('revoke', { title: 'Endpoint.fun / Revoke token', error: err.toString() })
    })
  })

  app.post('/new-token', (req, res) => {
    tokens.generateToken().then((token) => {
      console.log("Token generated", token)
      res.render('token-created', { title: 'Endpoint.fun / Created token', token: token })
    }).catch((err) => {
      console.error("Token failed to be generated", err)
      res.render('new-token', { title: 'Endpoint.fun / New token', error: err.toString() })
    })
  })

  app.post('/usage', (req, res) => {
    tokens.findTokenAndEvents(req.body['token']).then(([token, events]) => {
      const ts = (date: Date) => `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      const cost = (amt: number) => `$${(Math.round(amt) * 0.01).toFixed(2).padStart(5)}`;
      res.render('usage', {
        title: 'Endpoint.fun / Usage',
        token: token,
        events: events.map((evt) => ({ ts: ts(evt.ts), cost: cost(evt.cost), desc: evt.desc }))
      })
    }).catch((err) => {
      res.render('check-usage', {
        title: 'Endpoint.fun / Check usage',
        error: err.toString()
      })
    })
  })

  app.get('/usage', (req, res) => res.redirect('/check-usage'))
}
