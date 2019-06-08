import express = require('express')
import * as path from 'path'
const bodyParser = require('body-parser')

import { addTokenRoutes } from './routes/token'

import { Connection } from 'typeorm';

export function createApp(conn: Connection): express.Express {
  const app = express()

  app.set('view engine', 'pug')
  app.use(bodyParser.urlencoded({ extended: false }))

  app.use('/k', express.static(path.resolve(__dirname, '../k')))

  app.get('/', (req, res) => {
    res.render('index', { title: 'Endpoint.fun' })
  })

  app.get('/docs', (req, res) => {
    res.render('docs', { title: 'Endpoint.fun / docs' })
  })

  addTokenRoutes(app, conn)

  return app
}
