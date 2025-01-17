const App = {}

App.i = {}
App.i.fs = require(`fs`)
App.i.path = require(`path`)
App.i.io = require(`socket.io-client`)
App.i.express = require(`express`)
App.i.openai = require(`openai`)
App.i.fetch = require(`node-fetch`)
App.i.sentencer = require(`sentencer`)
App.i.random_sentence = require(`random-sentence`)
App.i.mathjs = require(`mathjs`)
App.i.axios = require(`axios`)
App.i.cheerio = require(`cheerio`)
App.i.parser = require(`rss-parser`)
App.i.rss_parser = new App.i.parser()

App.db = {}
App.config = {}

// Load all JS source files

let scr_path = App.i.path.join(__dirname, `.`)
let src_files

try {
  src_files = App.i.fs.readdirSync(scr_path)
}
catch (err) {
  process.exit(1)
}

let js_files = src_files.filter(f => f.endsWith(`.js`))
let this_file = App.i.path.basename(__filename)

for (let file of js_files) {
  if (file === this_file) {
    continue
  }

  let full_path = App.i.path.join(scr_path, file)
  require(full_path)(App)
}

// ---------

let args = process.argv.slice(2)
const configs_location = `../configs/`
App.configs_path = App.i.path.normalize(App.i.path.resolve(__dirname, configs_location) + `/`)

// Bot supports launching with a custom config file
// For instance `node huebot.json goodBot`
// ... would use ./configs/goodBot.json config file
// This is to allow multiple instances easily
// If no argument is passed then it uses default.json

if ((args.length >= 1) && (args[0] !== `default`)) {
  App.config_name = args[0]
}
else {
  App.config_name = `default`
}

App.log(`Using config file: ${App.config_name}`)
App.db.config = require(`${App.configs_path}${App.config_name}.json`)
App.def_config = require(`${App.configs_path}default.json`)

App.setup_config()
App.setup_files(args)

App.db.commands = require(`${App.files_path}commands.json`)
App.db.permissions = require(`${App.files_path}permissions.json`)
App.db.themes = require(`${App.files_path}themes.json`)
App.db.options = require(`${App.files_path}options.json`)
App.db.queue = require(`${App.files_path}queue.json`)
App.db.backgrounds = require(`${App.files_path}backgrounds`)
App.db.reminders = require(`${App.files_path}reminders`)
App.db.state = require(`${App.files_path}state`)

App.config.emit_limit = 10
App.config.socket_emit_throttle = 10
App.config.max_text_length = 2000
App.config.max_title_length = 250
App.config.recent_streams_max_length = 5
App.config.max_user_command_activity = 20
App.config.max_media_source_length = 800
App.config.max_media_comment_length = 80
App.config.max_list_items = 20
App.config.num_suggestions = 5

App.config.media_types = [`image`, `tv`]
App.config.upload_slice_size = 500000
App.prefix = App.db.config.command_prefix
App.connected_rooms = {}
App.file_uploads = {}

for (let room_id of App.db.config.room_ids) {
  App.start_connection(room_id)
}

App.start_emit_charge_loop()
App.start_rss_interval()
App.start_auto_theme_interval()
App.start_webserver()
App.start_ai()