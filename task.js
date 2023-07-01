const { EventEmitter } = require('node:events')

function delay(fn, args, ms) {
  return setTimeout(() => fn.apply(fn, args), ms)
}

function runner(task, done, pollingRate = 1000) {
  if (task.isValid()) return runner(task.run(), done, pollingRate)
  if (task.isRunning()) return delay(runner, arguments, pollingRate)
  if (task.isDone()) return done('done', task.result)
  if (task.isError()) return done('error', task.result)
  if (task.isAborted()) return done('aborted', task.result)
  throw new Error('Invalid Task')
}

class Task {
  constructor({ run, pollingRate, timeout }) {
    this._run = run
    this.state = 'CLEAN'
    this.result = undefined
    this.pollingRate = pollingRate ??= 500
    this.timeout = timeout ??= 0
  }

  changeState(state) {
    this.state = state
  }

  isValid() {
    return this.state === 'CLEAN'
  }

  isAborted() {
    return this.state === 'ABORTED'
  }

  isError() {
    return this.state === 'ERROR'
  }

  isDone() {
    return this.state === 'DONE'
  }

  isRunning() {
    return this.state === 'RUNNING'
  }

  run() {
    if (this.isRunning()) return this
    this.changeState('RUNNING')

    Promise.allSettled([this._run()]).then(([{ status, value, reason }]) => {
      if (this.isAborted()) return this
      if (status === 'rejected') {
        this.result = reason
        this.changeState('ERROR')
      } else {
        this.result = value
        this.changeState('DONE')
      }
    })

    // timeout handler
    if (this.timeout > 0) {
      setTimeout(() => process.nextTick(() => this.abort('timed')), this.timeout)
    }

    return this
  }

  abort(reason) {
    if (this.isDone()) return
    this.result = reason
    this.changeState('ABORTED')
  }
}

class TaskRunner extends EventEmitter {
  constructor(task) {
    super()
    this.task = task
  }

  run() {
    const handler = (state, result) => this.emit(state, result)
    runner(this.task, handler, this.task.pollingRate)
  }
}

/* Samples */
const successTask = new Task({
  pollingRate: 1000,
  timeout: 250,
  run() {
    return new Promise((resolve) =>
      setTimeout(() => resolve('ok'), 400))
  }
})

var taskRunner = new TaskRunner(successTask)
taskRunner.run()
taskRunner.on('done', (result) => console.log(result))
taskRunner.on('error', (result) => console.error(result))
taskRunner.on('aborted', (result) => console.log('aborted', result))
