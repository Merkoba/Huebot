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

// Load all JS files
let scr_path = App.i.path.join(__dirname, `.`)

let src_files

try {
  src_files = App.i.fs.readdirSync(scr_path)
}
catch (err) {
  console.log(`Failed to read the source`)
  process.exit(1)
}

let js_files = src_files.filter((f => f.endsWith(`.js`)))
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

App.start_connection = (room_id) => {
  let ctx = {}

  ctx.room_id = room_id
  ctx.username = ``
  ctx.role = false
  ctx.room_image_mode = `disabled`
  ctx.room_tv_mode = `disabled`
  ctx.theme
  ctx.text_color
  ctx.emit_queue_timeout
  ctx.emit_queue = []
  ctx.recent_youtube_streams = []
  ctx.userlist = []
  ctx.background
  ctx.current_image_source
  ctx.current_tv_source
  ctx.commands_queue = {}
  ctx.user_command_activity = []
  ctx.emit_charge = 0
  ctx.q_image_cooldown = 0
  ctx.q_tv_cooldown = 0

  ctx.socket = App.i.io(App.db.config.server_address, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 1000,
  })

  ctx.socket.binaryType = `arraybuffer`

  ctx.socket.on(`connect`, () => {
    App.socket_emit(ctx, `join_room`, {
      alternative: true,
      room_id,
      username: App.db.config.bot_username,
      password: App.db.config.bot_password,
      no_message_board_posts: true,
    })
  })

  ctx.socket.on(`update`, (received) => {
    try {
      let type = received.type
      let data = received.data

      if (type === `joined`) {
        if (data.room_locked) {
          App.log(`Seems I'm banned from this room`)
          return false
        }

        App.log(`Joined ${room_id}`)
        App.connected_rooms[room_id] = {context:ctx}
        App.set_username(ctx, data.username)
        App.set_role(ctx, data.role)
        App.set_room_enables(ctx, data)
        App.set_theme(ctx, data)
        App.set_background(ctx, data)
        App.set_userlist(ctx, data)
        App.set_media_sources(ctx, data)
      }
      else if (type === `chat_message`) {
        if (data.username === ctx.username) {
          return false
        }

        if (data.edited) {
          return false
        }

        // OH HAI WOODY
        if (ctx.greet_pattern.test(data.message)) {
          App.send_message(ctx, `hello ${data.username}!`)
        }

        if (App.is_command(data.message)) {
          let obj = {
            username: data.username,
            message: data.message,
            method: `public`,
          }

          App.process_command(ctx, obj)
        }

        App.check_reminders(ctx, data.username)
        App.check_speech(ctx, data, ``)
      }
      else if (type === `user_joined`) {
        App.add_to_userlist(ctx, data.username)
        App.check_reminders(ctx, data.username)
      }
      else if (type === `user_disconnected`) {
        App.remove_from_userlist(ctx, data.username)
      }
      else if (type === `new_username`) {
        if (ctx.username === data.old_username) {
          App.set_username(ctx, data.username)
        }

        App.replace_in_userlist(ctx, data.old_username, data.username)
      }
      else if (type === `background_color_changed`) {
        ctx.background_color = data.color
      }
      else if (type === `text_color_changed`) {
        ctx.text_color = data.color
      }
      else if (type === `user_role_changed`) {
        if (ctx.username === data.username2) {
          App.set_role(ctx, data.role)
        }
      }
      else if (type === `whisper`) {
        if (data.username === ctx.username) {
          return false
        }

        if (App.is_command(data.message)) {
          let obj = {
            username: data.username,
            message: data.message,
            method: `whisper`,
          }

          App.process_command(ctx, obj)
        }
        else {
          if (!App.is_admin(data.username)) {
            return false
          }

          App.send_whisper(ctx, data.username, `Hi!`)
        }
      }
      else if (type === `background_changed`) {
        App.set_background(ctx, data)
      }
      else if (type === `image_source_changed`) {
        App.set_image_source(ctx, data.source)
      }
      else if (type === `tv_source_changed`) {
        App.set_tv_source(ctx, data.source)
      }
      else if (type === `request_slice_upload`) {
        App.next_upload_slice(ctx, data)
      }
    }
    catch (err) {
      App.log(err, `error`)
    }
  })

  ctx.socket.on(`disconnect`, () => {
    delete App.connected_rooms[room_id]
  })
}

for (let room_id of App.db.config.room_ids) {
  App.start_connection(room_id)
}

App.start_emit_charge_loop()
App.start_rss_interval()
App.start_auto_theme_interval()
App.start_webserver()
App.start_ai()