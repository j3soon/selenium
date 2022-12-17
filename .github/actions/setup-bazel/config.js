const os = require('os')
const yaml = require('yaml')
const core = require('@actions/core')

const bazelRcConfig = yaml.parse(core.getInput('bazelrc'))
const cacheVersion = core.getInput('cache-version')
const externalCacheConfig = yaml.parse(core.getInput('external-cache'))

const homeDir = os.homedir()
const platform = os.platform()

const bazelRepository = core.toPosixPath(`${homeDir}/.cache/bazel-repo`)
let bazelOutputBase = `${homeDir}/.bazel`
let userCacheDir = `${homeDir}/.cache`

switch (platform) {
  case 'darwin':
    userCacheDir = `${homeDir}/Library/Caches`
    break
  case 'win32':
    bazelOutputBase = 'D:/_bazel'
    userCacheDir = `${homeDir}/AppData/Local`
    break
}

const bazelRc = { build: {} }
// if (bazelRcConfig) {
//   for (const command in bazelRcConfig) {
//     bazelRc[command] = bazelRcConfig[command]
//   }
// }

if (core.getBooleanInput('repository-cache')) {
  bazelRc.build.repository_cache = bazelRepository
}

const externalCache = {}
if (externalCacheConfig) {
  for (const name in externalCacheConfig) {
    externalCache[name] = Array(externalCacheConfig[name]).flat()
  }
}

module.exports = {
  baseCacheKey: `setup-bazel-${cacheVersion}-${os.platform()}`,
  bazelRc,
  externalCache,
  paths: {
    bazelExternal: core.toPosixPath(`${bazelOutputBase}/external`),
    bazelOutputBase: core.toPosixPath(bazelOutputBase),
    bazelRc: core.toPosixPath(`${homeDir}/.bazelrc`),
    bazelRepository,
    bazelisk: core.toPosixPath(`${userCacheDir}/bazelisk`)
  },
  platform
}
