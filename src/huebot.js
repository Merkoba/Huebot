// T15

const path = require('path')
const fs = require("fs")
const io = require("socket.io-client")
const express = require("express")

const Huebot = {}
Huebot.db = {}
Huebot.config = {}

require("./cmds.js")(Huebot)
require("./procs.js")(Huebot)
require("./utils.js")(Huebot)

let args = process.argv.slice(2)
const configs_location = "../configs/"
const configs_path = path.normalize(path.resolve(__dirname, configs_location) + "/")

// Huebot supports launching with a custom config file
// For instance `node huebot.json goodBot`
// ... would use ./configs/goodBot.json config file
// This is to allow multiple instances easily
// If no argument is passed then it uses default.json

let config_name

if (args.length >= 1 && args[0] != "default") {
	config_name = args[0]
} else {
	config_name = "default"
}

console.info(`Using config file: ${config_name}`)
Huebot.db.config = require(`${configs_path}${config_name}.json`)

const template_files_location = `../files/_template_`
const template_files_path = path.normalize(path.resolve(__dirname, template_files_location) + "/")

let files_name

if (args.length >= 2 && args[1] != "default") {
	files_name = args[1]
} else {
	files_name = "default"
}

console.info(`Files path: ${files_name}`)
const files_location = `../files/${files_name}`
Huebot.files_path = path.normalize(path.resolve(__dirname, files_location) + "/")

// Check if files dir exists
if (!fs.existsSync(Huebot.files_path)) {
	fs.mkdirSync(Huebot.files_path)
	console.info(`Created Dir: ${Huebot.files_path}`)
}

// Check if a file needs to be copied from the template dir
for (let file of fs.readdirSync(template_files_path)) {
	let p = path.normalize(path.resolve(Huebot.files_path, file))
	if (!fs.existsSync(p)) {
		let p0 = path.normalize(path.resolve(template_files_path, file))
		fs.copyFileSync(p0, p)
		console.info(`Copied: ${file}`)
	}
}

Huebot.db.commands = require(`${Huebot.files_path}commands.json`)
Huebot.db.permissions = require(`${Huebot.files_path}permissions.json`)
Huebot.db.themes = require(`${Huebot.files_path}themes.json`)
Huebot.db.options = require(`${Huebot.files_path}options.json`)
Huebot.db.queue = require(`${Huebot.files_path}queue.json`)
Huebot.db.backgrounds = require(`${Huebot.files_path}backgrounds`)
Huebot.db.reminders = require(`${Huebot.files_path}reminders`)
Huebot.db.state = require(`${Huebot.files_path}state`)

Huebot.config.socket_emit_throttle = 10
Huebot.config.max_text_length = 2000
Huebot.config.max_title_length = 250
Huebot.config.recent_streams_max_length = 5
Huebot.config.max_user_command_activity = 20
Huebot.config.max_media_source_length = 800
Huebot.config.max_list_items = 20
Huebot.config.num_suggestions = 5
Huebot.config.emit_limit = 5

Huebot.config.media_types = ["image", "tv"]
Huebot.prefix = Huebot.db.config.command_prefix
Huebot.connected_rooms = {}

Huebot.start_connection = function (room_id) {
	let ctx = {}

	ctx.username = ""
	ctx.role = false
	ctx.room_image_mode = "disabled"
	ctx.room_tv_mode = "disabled"
	ctx.theme
	ctx.text_color
	ctx.emit_queue_timeout
	ctx.emit_queue = []
	ctx.recent_youtube_streams = []
	ctx.userlist = []
	ctx.background_image
	ctx.current_image_source
	ctx.current_tv_source
	ctx.commands_queue = {}
	ctx.user_command_activity = []
	ctx.emit_charge = 0
	ctx.q_image_cooldown = 0
	ctx.q_tv_cooldown = 0

	ctx.socket = io(Huebot.db.config.server_address, {
		reconnection: true,
		reconnectionDelay: 1000,
		reconnectionDelayMax: 5000,
		reconnectionAttempts: 1000
	})

	ctx.socket.on('connect', function () {
		Huebot.socket_emit(ctx, 'join_room', {
			alternative: true,
			room_id: room_id,
			email: Huebot.db.config.bot_email,
			password: Huebot.db.config.bot_password,
			no_message_log: true
		})
	})

	ctx.socket.on('update', function (received) {
		try {
			let type = received.type
			let data = received.data

			if (type === 'joined') {
				if (data.room_locked) {
					console.info("Seems I'm banned from this room")
					return false
				}

				console.info(`Joined ${room_id}`)
				Huebot.connected_rooms[room_id] = {context:ctx}
				Huebot.set_username(ctx, data.username)
				Huebot.set_role(ctx, data.role)
				Huebot.set_room_enables(ctx, data)
				Huebot.set_theme(ctx, data)
				Huebot.set_background_image(ctx, data.background_image)
				Huebot.set_userlist(ctx, data)
				Huebot.set_image_source(ctx, data.image_source)
				Huebot.set_tv_source(ctx, data.tv_source)
			} else if (type === 'chat_message') {
				if (data.username === ctx.username) {
					return false
				}

				if (data.edited) {
					return false
				}

				if (data.message === `hi ${ctx.username}` || data.message === `${ctx.username} hi`) {
					Huebot.send_message(ctx, `hello ${data.username}!`)
				}

				if (Huebot.is_command(data.message)) {
					let obj = {
						username: data.username,
						message: data.message,
						method: "public"
					}

					Huebot.process_command(ctx, obj)
				}

				Huebot.check_reminders(ctx, data.username)
				Huebot.check_speech(ctx, data, "")
			} else if (type === "user_joined") {
				Huebot.add_to_userlist(ctx, data.username)
				Huebot.check_reminders(ctx, data.username)
			} else if (type === "user_disconnected") {
				Huebot.remove_from_userlist(ctx, data.username)
			} else if (type === 'new_username') {
				if (ctx.username === data.old_username) {
					Huebot.set_username(ctx, data.username)
				}

				Huebot.replace_in_userlist(ctx, data.old_username, data.username)
			} else if (type === 'background_color_changed') {
				ctx.background_color = data.color
			} else if (type === 'text_color_changed') {
				ctx.text_color = data.color
			} else if (type === 'announce_role_changed') {
				if (ctx.username === data.username2) {
					Huebot.set_role(ctx, data.role)
				}
			} else if (type === "whisper") {
				if (data.username === ctx.username) {
					return false
				}

				if (Huebot.is_command(data.message)) {
					let obj = {
						username: data.username,
						message: data.message,
						method: "whisper"
					}

					Huebot.process_command(ctx, obj)
				} else {
					if (!Huebot.is_admin(data.username)) {
						return false
					}

					Huebot.send_whisper(ctx, data.username, "Hi!")
				}
			} else if (type === 'background_image_changed') {
				Huebot.set_background_image(ctx, data.background_image)
			} else if (type === 'image_source_changed') {
				Huebot.set_image_source(ctx, data.source)
			} else if (type === 'tv_source_changed') {
				Huebot.set_tv_source(ctx, data.source)
			}
		} catch (err) {
			console.error(err)
		}
	})

	ctx.socket.on('disconnect', function () {
		delete Huebot.connected_rooms[room_id]
	})
}

for (let room_id of Huebot.db.config.room_ids) {
	Huebot.start_connection(room_id)
}

Huebot.start_emit_charge_loop()
Huebot.start_slashdot_interval()

// Web Server

const app = express()

if (Huebot.db.config.use_webserver) {
	app.get('/show_message', (req, res) => {
		if (req.query.message) {
			let text = req.query.message.trim()
			if (text) {
				for (let key in Huebot.connected_rooms) {
					Huebot.send_message(Huebot.connected_rooms[key].context, text)
				}
			}
		}

		res.send("ok")
	})

	let port = Huebot.db.config.webserver_port
	
	app.listen(port, () => {
		console.log(`Web server started on port ${port}`)
	})
}