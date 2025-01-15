/* eslint-disable */

const OPENAI_KEY = `someKey`
const GOOGLE_KEY = `someKey`

const BOTS = [
  `john`,
  `paul`,
  `george`,
  `ringo`,
]

const COMMON = {
  script: `huebot/src/huebot.js`,
  instances: 1,
  autorestart: true,
  watch: false,
  max_memory_restart: `1G`,
  env: {
    NODE_ENV: `production`,
    OPENAI_API_KEY: OPENAI_KEY,
    GOOGLE_API_KEY: GOOGLE_KEY,
  },
  env_production: {
    NODE_ENV: `production`,
  },
}

function bot (name) {
  return Object.assign({}, COMMON, {
    name: `huebot_${name}`,
    args: `${name} ${name}`,
  })
}

const apps = []

for (const name of BOTS) {
  apps.push(bot(name))
}

module.exports = {
  apps,
}