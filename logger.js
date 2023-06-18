import winston, { Container, config } from 'winston'

export {
  winston
}

const LOCAL_TIME = winston.format.timestamp({
  format: Intl.DateTimeFormat('VN-vi', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'asia/ho_chi_minh'
  }).format
})

const container = new Container()

export const createLogger = (id, handler, { transports, levels } = {}) => {
  const _format = winston.format.combine(LOCAL_TIME, winston.format.json(), winston.format.printf(handler))
  const _levels = levels ?? config.syslog.levels
  const _transports = transports ?? [
    new winston.transports.Console(),
    new winston.transports.File({ filename: `logs/${id}.log` })
  ]

  const options = {
    levels: _levels,
    transports: _transports,
    format: _format,
  }

  const logger = container.add(id, options)
  logger.info = logger.log.bind(logger, 'info')

  return logger
}

export default container
