const fs = require('fs')
const os = require('os')
const yaml = require('yaml')
const core = require('@actions/core')

const cacheVersion = core.getInput('cache-version')
const externalCacheConfig = yaml.parse(core.getInput('external-cache'))

const homeDir = os.homedir()
const platform = os.platform()

const bazelDisk = core.toPosixPath(`${homeDir}/.cache/bazel-disk`)
const bazelRepository = core.toPosixPath(`${homeDir}/.cache/bazel-repo`)
let bazelOutputBase = `${homeDir}/.bazel`
let externalTmp = `${homeDir}/externalTmp`
let userCacheDir = `${homeDir}/.cache`

switch (platform) {
  case 'darwin':
    userCacheDir = `${homeDir}/Library/Caches`
    break
  case 'win32':
    bazelOutputBase = 'D:/_bazel'
    externalTmp = 'D:/_externalTmp'
    userCacheDir = `${homeDir}/AppData/Local`
    break
}

const bazelrc = core.getMultilineInput('bazelrc')

const diskCacheConfig = core.getInput('disk-cache')
let diskCacheName = 'disk'
if (diskCacheConfig.length > 0) {
  bazelrc.push(`build --disk_cache=${bazelDisk}`)
  diskCacheName = `${diskCacheName}-${diskCacheConfig}`
}

if (core.getBooleanInput('repository-cache')) {
  bazelrc.push(`build --repository_cache=${bazelRepository}`)
}

const googleCredentials = core.getInput('google-credentials')
const googleCredentialsSaved = (core.getState('google-credentials-path').length > 0)
if (googleCredentials.length > 0 && !googleCredentialsSaved) {
  const tmpDir = core.toPosixPath(fs.mkdtempSync(os.tmpdir()))
  const googleCredentialsPath = `${tmpDir}/key.json`
  fs.writeFileSync(googleCredentialsPath, googleCredentials)
  bazelrc.push(`build --google_credentials=${googleCredentialsPath}`)
  core.saveState('google-credentials-path', googleCredentialsPath)
}

const bazelExternal = core.toPosixPath(`${bazelOutputBase}/external`)
const externalCache = {}
if (externalCacheConfig) {
  for (const name in externalCacheConfig) {
    externalCache[name] = {
      files: Array(externalCacheConfig[name]).flat(),
      name: `external-${name.replace('*', '')}`,
      packageTo: core.toPosixPath(`${externalTmp}/${name.replace('*', '')}`),
      paths: [
        `${bazelExternal}/@${name}.marker`,
        `${bazelExternal}/${name}`
      ]
    }
  }
}

module.exports = {
  baseCacheKey: `setup-bazel-${cacheVersion}-${os.platform()}`,
  bazeliskCache: {
    files: ['.bazelversion'],
    name: 'bazelisk',
    paths: [core.toPosixPath(`${userCacheDir}/bazelisk`)]
  },
  bazelrc,
  diskCache: {
    files: [
      '**/BUILD.bazel',
      '**/BUILD',
      'WORKSPACE.bazel',
      'WORKSPACE'
    ],
    name: diskCacheName,
    paths: [bazelDisk]
  },
  externalCache,
  paths: {
    bazelExternal,
    bazelOutputBase: core.toPosixPath(bazelOutputBase),
    bazelrc: core.toPosixPath(`${homeDir}/.bazelrc`)
  },
  repositoryCache: {
    files: [
      '**/BUILD.bazel',
      '**/BUILD',
      'WORKSPACE.bazel',
      'WORKSPACE'
    ],
    name: 'repository',
    paths: [bazelRepository]
  },
  platform
}
