import fs from 'fs'
import axios from 'axios'

export async function saveHtmlFromUrl(url, fileName) {
  const response = await axios.get(url, { responseType: 'stream' })
  const writeStream = fs.createWriteStream(fileName)

  response.data.pipe(writeStream)

  return new Promise((resolve, reject) => {
    writeStream.on('finish', resolve)
    writeStream.on('error', reject)
  })
}

// Example usage:
// const url = new URL('https://sample.com')
// const fileName = `${url.hostname}_${Date.now()}.html`
// 
// saveHtmlFromUrl(url, fileName)
//   .then(() => console.log(`saved ${fileName}`))
//   .catch((error) => console.error('Error:', error))
