import { AsyncLocalStorage } from 'node:async_hooks'
import { resolve } from 'node:path'
import express from 'express'
import session from 'express-session'
import { createLogger } from './logger.js'

const sessionStorage = new AsyncLocalStorage()
const errorLogger = createLogger('error', ({ timestamp, sessionID, message }) => {
  return `${timestamp} ${sessionID} ${message}`
})

const accessLogger = createLogger('access', ({ timestamp, sessionID, method, url }) => {
  return `${timestamp} ${sessionID} ${method} ${url}`
})

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session({
  name: process.env.SESSION_NAME,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    maxAge: 60 * 60 * 24 * 1000 // 1day
  }
}))

app.use((req, _, next) => {
  sessionStorage.run(req.sessionID, () => {
    accessLogger.info({ sessionID: req.sessionID, method: req.method, url: req.url })
    next()
  })
})

// Public

// Privates

// rewrite api routes
app.use((req, res, next) => {
  req.url = req.url.replace('/api', '')
  next('route')
})

app.use(express.static('bundles', { redirect: false }))
app.get('/:apps', (req, res) => {
  // return :apps.html
  var index = resolve(`bundles/${req.params.apps}.html`)
  res.sendFile(index, () => {
    // or :apps/index.html
    if (!res.headersSent) {
      var index = resolve(`bundles/${req.params.apps}/index.html`)
      res.sendFile(index)
    }
  })
})

app.use('*', (_, res) => res.sendStatus(404))
app.use((err, req, res, next) => {
  errorLogger.error({ sessionID: req.sessionID, message: err.message })
  if (err.status === 404) return res.sendStatus(404) // handle :apps not found
  if (res.headersSent) return next(err)
  res.status(500).send('Something went wrong!')
})

app.listen(process.env.PORT || 8080, () => console.log('Server up!'))
