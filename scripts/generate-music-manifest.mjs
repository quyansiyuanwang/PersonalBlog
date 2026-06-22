import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(currentDir, '..')
const rootMusicDir = resolve(rootDir, 'music')
const publicMusicDir = resolve(rootDir, 'public/music')
const outputFile = resolve(rootDir, 'src/generated/music.ts')
const supportedExtensions = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac'])
const musicDir = existsSync(rootMusicDir) ? rootMusicDir : publicMusicDir

mkdirSync(publicMusicDir, { recursive: true })

function writeFileIfChanged(filePath, content) {
  if (existsSync(filePath) && readFileSync(filePath, 'utf8') === content) return

  writeFileSync(filePath, content, 'utf8')
}

function copyFileIfChanged(sourcePath, targetPath) {
  if (existsSync(targetPath)) {
    const sourceStats = statSync(sourcePath)
    const targetStats = statSync(targetPath)

    if (sourceStats.size === targetStats.size && sourceStats.mtimeMs <= targetStats.mtimeMs) return
  }

  copyFileSync(sourcePath, targetPath)
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\u4e00-\u9fff-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function parseTrack(fileName) {
  const withoutExt = fileName.slice(0, -extname(fileName).length)
  const [rawArtist = 'Unknown Artist', rawTitle = withoutExt] = withoutExt.split(' - ')
  const title = rawTitle.trim() || withoutExt
  const artist = rawArtist
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .join(' · ') || 'Unknown Artist'

  return {
    id: slugify(`${rawArtist}-${title}`) || `track-${Date.now()}`,
    title,
    artist,
    fileName,
  }
}

const tracks = readdirSync(musicDir)
  .filter((fileName) => supportedExtensions.has(extname(fileName).toLowerCase()))
  .sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'))
  .map(parseTrack)

tracks.forEach((track) => {
  copyFileIfChanged(resolve(musicDir, track.fileName), resolve(publicMusicDir, track.fileName))
})

const output = `export interface MusicTrack {
  id: string
  title: string
  artist: string
  fileName: string
  url: string
}

export const musicTracks: MusicTrack[] = [
${tracks
  .map(
    (track) => `  {
    id: ${JSON.stringify(track.id)},
    title: ${JSON.stringify(track.title)},
    artist: ${JSON.stringify(track.artist)},
    fileName: ${JSON.stringify(track.fileName)},
    url: \`${'${import.meta.env.BASE_URL}'}music/${track.fileName}\`,
  },`,
  )
  .join('\n')}
]
`

writeFileIfChanged(outputFile, output)