import express = require('express')
import * as path from 'path'
const bodyParser = require('body-parser')

const app = express()

app.set('view engine', 'pug')

app.use('/k', express.static(path.resolve(__dirname, '../k')))

app.get('/', (req, res) => {
  res.render('index', { title: 'Endpoint.fun' })
})

app.get('/check-usage', (req, res) => {
  res.render('check-usage', { title: 'Endpoint.fun / Check usage' })
})

app.get('/revoke', (req, res) => {
  res.render('revoke', { title: 'Endpoint.fun / Revoke token' })
})

app.get('/docs', (req, res) => {
  res.render('docs', { title: 'Endpoint.fun / docs' })
})

app.get('/new-token', (req, res) => {
  res.render('new-token', { title: 'Endpoint.fun / New token' })
})

app.use(bodyParser.urlencoded({ extended: false }))

app.post('/revoke', (req, res) => {
  console.log('TODO revoke token:', req.body['token'])
  res.redirect('/?from=revoked')
})

app.post('/new-token', (req, res) => {
  console.log('new-token body:', req.body)
  const token = Math.random().toString(16).slice(2, 12)
  res.render('token-created', { title: 'Endpoint.fun / Created token', token })
})

app.post('/usage', (req, res) => {
  console.log('usage token:', req.body['token'])
  const exampleDate = new Date();
  const ts = (date: Date) => `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  res.render('usage', {
    title: 'Endpoint.fun / Usage',
    events: [
      { ts: ts(exampleDate), desc: "Uploaded wasm", cost: "$  .10"}
    ]
  })
})

app.get('/usage', (req, res) => {
  res.redirect('/check-usage')
})

export { app }
