
import { Express, Router } from 'express'
import { Connection } from 'typeorm'

import { TokenBL, FunctionBL } from '../domain'

export function addFunRoutes(app: Express, conn: Connection) {
  const funs = FunctionBL.fromConnection(conn)
  const tokens = TokenBL.fromConnection(conn)

  app.post('/new-function', async (req, res) => {
    try {
      const token = req.body['token']
      const fnbody = req.body['fnbody']
      const activeToken = await tokens.findActiveToken(token)

      const fun = await funs.createFunction(activeToken, fnbody)

      res.redirect(`/v0/${fun.id}`)
    } catch (error) {
      res.render('new-function', { error })
    }
  })

  app.get('/new-function', async (req, res) => {
    res.render('new-function')
  })

  const v0 = Router()

  v0.use(require('body-parser').json())

  v0.get('/:funId', async (req, res) => {
    const funId = req.params.funId

    const fun = await funs.findFunction(funId)

    res.render('function-docs', { fun, schema: fun.schema() })
  })

  v0.post('/:funId/:funName', async (req, res) => {
    const funId = req.params.funId
    const funName = req.params.funName
    const args = req.body
    const argsAsc = Object.keys(args).sort().map(k => args[k])
    const result = await funs.callFunction(funId, funName, argsAsc)
    res.end(JSON.stringify(result, null, 2))
  })

  app.use('/v0', v0)
}
