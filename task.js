const { EventEmitter } = require('node:events')

function delay(fn, args, ms) {
  return setTimeout(() => fn.apply(fn, args), ms)
}

function runner(task, done, pollingRate = 1000) {
  if (task.isValid()) return runner(task.run(), done, pollingRate)
  if (task.isRunning()) return delay(runner, arguments, pollingRate)
  if (task.isDone()) return done('done', task.result)
  if (task.isError()) return done('error', task.result)
  if (task.isAborted()) return done('aborted')
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
    this._run()
      .then((result) => {
        if (!this.isAborted()) {
          this.result = result
          this.changeState('DONE')
        }
      })
      .catch((error) => {
        if (!this.isAborted()) {
          this.result = error
          this.changeState('ERROR')
        }
      })

    // timeout handler
    if (this.timeout > 0) {
      setTimeout(() => process.nextTick(() => this.abort()), this.timeout)
    }

    return this
  }

  abort() {
    if (!this.isDone()) this.changeState('ABORTED')
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
  timeout: 300,
  run() {
    return new Promise((resolve) =>
      setTimeout(() => resolve('ok'), 400))
  }
})

var taskRunner = new TaskRunner(successTask)
taskRunner.run()
taskRunner.on('done', (result) => console.log(result))
taskRunner.on('error', (result) => console.error(result))
taskRunner.on('aborted', () => console.log('aborted'))
