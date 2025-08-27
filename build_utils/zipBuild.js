import { createWriteStream } from 'fs'
import { join } from 'path'
import archiver from 'archiver'

const buildDir = 'dist' // Adjust this if your build directory is different
const output = createWriteStream(join(buildDir, '../build.zip'))

const archive = archiver('zip', {
  zlib: { level: 9 }, // Sets the compression level
})

output.on('close', () => {
  console.log(`Archive created successfully. Total bytes: ${archive.pointer()}`)
})

archive.on('error', (err) => {
  throw err
})

archive.pipe(output)

// Exclude the _MACOSX folder
archive.glob('**/*', {
  cwd: buildDir,
  ignore: ['_MACOSX/**'],
})

archive.finalize()