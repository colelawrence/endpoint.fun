import { Express } from 'express'
import { Connection } from 'typeorm'

import { TokenBL } from '../domain'

export function addTokenRoutes(app: Express, conn: Connection) {
  const tokens = TokenBL.fromConnection(conn)

  app.get('/check-usage', (req, res) => {
    res.render('check-usage')
  })

  app.get('/revoke', (req, res) => {
    res.render('revoke')
  })

  app.get('/new-token', (req, res) => {
    res.render('new-token')
  })

  app.post('/revoke', (req, res) => {
    tokens.revokeToken(req.body['token']).then((token) => {
      console.log("Token revoked", token)
      res.redirect('/?from=revoked')
    }).catch(err => {
      console.error("Token failed to be revoked", err)
      res.render('revoke', { error: err.toString() })
    })
  })

  app.post('/new-token', (req, res) => {
    tokens.generateToken().then((token) => {
      console.log("Token generated", token)
      res.render('token-created', { token: token })
    }).catch(err => {
      console.error("Token failed to be generated", err)
      res.render('new-token', { error: err.toString() })
    })
  })

  app.post('/usage', (req, res) => {
    tokens.findTokenAndEvents(req.body['token']).then(([token, events]) => {
      const ts = (date: Date) => `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      const cost = (amt: number) => `$${(Math.round(amt) * 0.0001).toFixed(3).padStart(5)}`;
      res.render('usage', {
        token: token,
        events: events.map(evt => ({ ts: ts(evt.ts), cost: cost(evt.cost), desc: evt.desc })),
        totalCost: cost(events.map(evt => evt.cost).reduce((a, b) => Math.round(b) + a, 0)),
      })
    }).catch(err => {
      res.render('check-usage', { error: err.toString() })
    })
  })

  app.get('/usage', (req, res) => res.redirect('/check-usage'))
}
