import fs from 'fs-extra'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const buildDir = join(__dirname, '../dist')
const oldFile = join(buildDir, 'index.html')
const newFile = join(buildDir, 'index.vm')

fs.rename(oldFile, newFile, (err) => {
  if (err) throw err
  console.log('index.html renamed to index.vm')
})