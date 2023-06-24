import os from 'node:os'
import fs from 'node:fs'

const writeToFile = (filePath, data) => {
  fs.appendFileSync(filePath, `${data}${os.EOL}`)
}

const readFromFile = (filePath) => {
  const data = fs.readFileSync(filePath, 'utf8')
  return data.trim().split(os.EOL)
}

const writeLinesToFile = (filePath, lines) => {
  fs.writeFileSync(filePath, lines.join(os.EOL).concat(os.EOL))
}

export default function createFileQueue(filePath) {
  const enqueue = (line) => {
    writeToFile(filePath, line)
  }

  const dequeue = () => {
    const lines = readFromFile(filePath)
    const line = lines.shift()
    writeLinesToFile(filePath, lines)
    return line
  }

  const peek = () => {
    const lines = readFromFile(filePath)
    return lines[0]
  }

  const isEmpty = () => {
    const lines = readFromFile(filePath)
    return lines.length === 0
  }

  return {
    enqueue,
    dequeue,
    peek,
    isEmpty
  }
}
