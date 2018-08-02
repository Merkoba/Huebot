const path = require('path')
const fs = require("fs")
const io = require("socket.io-client")
const fetch = require("node-fetch")
const cheerio = require("cheerio")
const linkify = require("linkifyjs")

var commands = require("./commands.json")
var permissions = require("./permissions.json")
var themes = require("./themes.json")
var options = require("./options.json")
var queue = require("./queue.json")

var user_command_activity = []

const room_id = "main"

const bot_email = "xxx"
const bot_password = "xxx"

const twitch_client_id = "xxx"
const twitch_enabled = true
const youtube_client_id = "xxx"
const youtube_enabled = true

const server_address = "http://localhost:3210"
// const server_address = "https://hue.merkoba.com"

const command_prefix = "."
const media_types = ["image", "tv", "radio"]
var protected_admins = ["mad"]

var available_commands = 
[
	'image',
	'tv',
	'radio',
	'set',
	'setforce',
	'unset',
	'rename',
	'list',
	'random',
	'q',
	'adminadd',
	'adminremove',
	'admins',
	'themeadd',
	'themeremove',
	'themerename',
	'theme',
	'themes',
	'linktitles',
	'stream',
	'activity',
	'clearcommands',
	'clearadmins',
	'clearthemes',
	'help',
	'ping',
	'whatis'
]

var username = ""
var role = false
var room_images_mode = "disabled"
var room_tv_mode = "disabled"
var room_radio_mode = "disabled"
var can_chat = false
var can_tv = false
var can_radio = false
var vpermissions = {}
var theme
var text_color
var text_color_mode
var emit_queue_timeout
var emit_queue = []
var socket_emit_throttle = 10
var max_text_length = 2000
var max_title_length = 250

vpermissions.voice1_chat_permission = false
vpermissions.voice1_images_permission = false
vpermissions.voice1_tv_permission = false
vpermissions.voice1_radio_permission = false
vpermissions.voice2_chat_permission = false
vpermissions.voice2_images_permission = false
vpermissions.voice2_tv_permission = false
vpermissions.voice2_radio_permission = false
vpermissions.voice3_chat_permission = false
vpermissions.voice3_images_permission = false
vpermissions.voice3_tv_permission = false
vpermissions.voice3_radio_permission = false
vpermissions.voice4_chat_permission = false
vpermissions.voice4_images_permission = false
vpermissions.voice4_tv_permission = false
vpermissions.voice4_radio_permission = false

const socket = io(server_address,
{
	reconnection: true,
	reconnectionDelay: 1000,
	reconnectionDelayMax : 5000,
	reconnectionAttempts: 1000
})

socket.on('connect', function() 
{
	socket_emit('join_room', 
	{
		alternative: true, 
		room_id: room_id, 
		email: bot_email, 
		password: bot_password
	})
})

socket.on('update', function(data) 
{
	try
	{
		if(data.type === 'joined')
		{
			set_username(data.username)
			set_role(data.role)
			set_room_enables(data)
			set_permissions(data)
			set_theme(data)
			check_permissions()
		}

		else if(data.type === 'chat_message')
		{
			if(data.username === username)
			{
				return false
			}

			if(data.message === `hi ${username}` || data.message === `${username} hi`)
			{
				send_message(`hello ${data.username}!`)
			}

			if(is_command(data.message))
			{
				process_command(data)
			}

			else
			{
				if(options.link_titles)
				{
					var links = linkify.find(data.message)

					if(links)
					{
						for(let i=0; i<links.length; i++)
						{
							var link = links[i]

							var href = link.href

							if(!href.startsWith("http://") && !href.startsWith("https://"))
							{
								continue
							}

							if(i >= 3)
							{
								break
							}

							var extension = get_extension(href).toLowerCase()

							if(extension)
							{
								if(extension !== "html" && extension !== "php")
								{
									continue
								}
							}

							fetch(href)
							
							.then(res => 
							{
								return res.text()
							})
							
							.then(body => 
							{
								var $ = cheerio.load(body)
								var title = clean_string2($("title").text().substring(0, max_title_length))
								
								if(title)
								{
									send_message(`[ Title: ${title} ]`)
								}
							})

							.catch(err =>
							{
								console.error(err)
							})
						}
					}
				}
			}
		}

		else if(data.type === 'room_images_mode_change')
		{
			room_images_mode = data.what
			check_permissions()
		}

		else if(data.type === 'room_tv_mode_change')
		{
			room_tv_mode = data.what
			check_permissions()
		}

		else if(data.type === 'room_radio_mode_change')
		{
			room_radio_mode = data.what
			check_permissions()
		}

		else if(data.type === 'voice_permission_change')
		{
			vpermissions[data.ptype] = data.what
			check_permissions()
		}

		else if(data.type === 'new_username')
		{
			if(username === data.old_username)
			{
				set_username(data.username)
			}
		}

		else if(data.type === 'theme_change')
		{
			theme = data.color
		}

		else if(data.type === 'text_color_changed')
		{
			text_color = data.color
		}

		else if(data.type === 'text_color_mode_changed')
		{
			text_color_mode = data.mode
		}

		else if(data.type === 'announce_role_change')
		{
			if(username === data.username2)
			{
				set_role(data.role)
				check_permissions()
			}
		}

		else if(data.type === "whisper")
		{
			if(is_command(data.message))
			{
				process_command(data)
			}

			else
			{
				if(!is_admin(data.username))
				{
					return false
				}

				socket_emit('whisper', 
				{
					username: data.username, 
					message: "Hi! I hope you like my drawing :)", 
					draw_coords: generate_random_drawing()
				})
			}
		}
	}

	catch(err)
	{
		console.error(err)
	}
})

function send_message(message)
{
	if(!can_chat)
	{
		return false
	}

	message = message.substring(0, max_text_length).replace(/[\n\r]+/g, '\n').replace(/\s+$/g, '')
	
	socket_emit('sendchat', {message:message})	
}

function change_image(src, feedback=false)
{
	if(!can_images)
	{
		console.error("No images permission")
		
		if(feedback)
		{
			send_message("I don't have permission to change the image.")
		}
		
		return false
	}
	
	socket_emit('change_image_source', {src:src})
}

function change_tv(src, feedback=false)
{
	if(!can_tv)
	{
		console.error("No tv permission")
		
		if(feedback)
		{
			send_message("I don't have permission to change the tv.")
		}

		return false
	}
	
	socket_emit('change_tv_source', {src:src})
}

function change_radio(src, feedback=false)
{
	if(!can_radio)
	{
		console.error("No radio permission")
		
		if(feedback)
		{
			send_message("I don't have permission to change the radio.")
		}

		return false
	}
	
	socket_emit('change_radio_source', {src:src})
}

function run_command(cmd, arg, data)
{
	var command = commands[cmd]

	if(command.type === "image")
	{
		change_image(command.url, true)
	}

	else if(command.type === "tv")
	{
		change_tv(command.url, true)
	}

	else if(command.type === "radio")
	{
		change_radio(command.url, true)
	}	

	else if(command.type === "alias")
	{
		let c = command.url.split(" ")[0]

		if(available_commands.includes(c))
		{
			data.message = `${command_prefix}${command.url} ${arg}`

			process_command(data)
		}
	}	
}

function check_permissions()
{
	can_chat = check_permission(role, "chat")
	can_images = room_images_mode === "enabled" && check_permission(role, "images")
	can_tv = room_tv_mode === "enabled" && check_permission(role, "tv")
	can_radio =  room_radio_mode === "enabled" && check_permission(role, "radio")
}

function check_permission(role, type)
{
	if(role === "admin" || role === "op")
	{
		return true
	}

	if(vpermissions[`${role}_${type}_permission`])
	{
		return true
	}

	return false	
}

function set_username(uname)
{
	username = uname
}

function set_role(rol)
{
	role = rol
}

function set_permissions(data)
{
	vpermissions.voice1_chat_permission = data.voice1_chat_permission
	vpermissions.voice1_images_permission = data.voice1_images_permission
	vpermissions.voice1_tv_permission = data.voice1_tv_permission
	vpermissions.voice1_radio_permission = data.voice1_radio_permission
	vpermissions.voice2_chat_permission = data.voice2_chat_permission
	vpermissions.voice2_images_permission = data.voice2_images_permission
	vpermissions.voice2_tv_permission = data.voice2_tv_permission
	vpermissions.voice2_radio_permission = data.voice2_radio_permission
	vpermissions.voice3_chat_permission = data.voice3_chat_permission
	vpermissions.voice3_images_permission = data.voice3_images_permission
	vpermissions.voice3_tv_permission = data.voice3_tv_permission
	vpermissions.voice3_radio_permission = data.voice3_radio_permission
	vpermissions.voice4_chat_permission = data.voice4_chat_permission
	vpermissions.voice4_images_permission = data.voice4_images_permission
	vpermissions.voice4_tv_permission = data.voice4_tv_permission
	vpermissions.voice4_radio_permission = data.voice4_radio_permission	
}

function set_room_enables(data)
{
	room_images_mode = data.room_images_mode
	room_tv_mode = data.room_tv_mode
	room_radio_mode = data.room_radio_mode	
}

function socket_emit(destination, data)
{
	var obj =
	{
		destination: destination,
		data: data
	}

	emit_queue.push(obj)

	if(emit_queue_timeout === undefined)
	{
		check_emit_queue()
	}
}

function check_emit_queue()
{
	if(emit_queue.length > 0)
	{
		var obj = emit_queue[0]

		if(obj !== "first")
		{
			do_socket_emit(obj)
		}

		emit_queue.shift()

		emit_queue_timeout = setTimeout(function()
		{
			check_emit_queue()
		}, socket_emit_throttle)
	}

	else
	{
		clearTimeout(emit_queue_timeout)
		emit_queue_timeout = undefined
	}
}

function do_socket_emit(obj)
{
	obj.data.server_method_name = obj.destination
	socket.emit("server_method", obj.data)
}

function get_random_int(min, max)
{
	return Math.floor(Math.random() * (max  -min + 1) + min)
}

function set_theme(data)
{
	theme = data.theme
	text_color_mode = data.text_color_mode
	text_color = data.text_color
}

function save_file(name, content, callback=false)
{
	fs.writeFile(path.join(__dirname, name), JSON.stringify(content), 'utf8', function(err)
	{
		if(err)
		{
			console.error(err)
		}

		else
		{
			if(callback)
			{
				return callback()
			}
		}
	})
}

function fill_defaults(args, def_args)
{
	for(var key in def_args)
	{
		var d = def_args[key]

		if(args[key] === undefined)
		{
			args[key] = d
		}
	}
}

function list_items(args={})
{
	var def_args =
	{
		data: {},
		filter: "",
		prepend: "",
		append: "",
		sort_mode: "none"
	}

	fill_defaults(args, def_args)

	args.filter = args.filter.toLowerCase()

	var list = []
	
	var do_filter = args.filter ? true : false

	if(Array.isArray(args.data))
	{
		var props = args.data
	}

	else
	{
		var props = Object.keys(args.data)
	}

	if(args.sort_mode === "random")
	{
		props = props.map(x => [Math.random(), x]).sort(([a], [b]) => a - b).map(([_, x]) => x)
	}

	else if(args.sort_mode === "sort")
	{
		props.sort()
	}

	for(var p of props)
	{
		if(do_filter)
		{
			if(p.toLowerCase().includes(args.filter))
			{
				list.push(`${args.prepend}${p}${args.append}`)
			}
		}

		else
		{
			list.push(`${args.prepend}${p}${args.append}`)
		}

		if(list.length === 20)
		{
			break
		}
	}

	if(list.length > 0)
	{
		var s = list.join(" ")

		if(args.append)
		{
			s = s.slice(0, -1)
		}
	}

	else
	{
		var s = false
	}

	return s
}

function get_extension(s)
{
	var matches = s.match(/\.(\w+)(?=$|[#?])/)

	if(matches)
	{
		return matches[1]
	}

	else
	{
		return ""
	}
}

function clean_string2(s)
{
	return s.replace(/\s+/g, ' ').trim()
}

function generate_random_drawing()
{
	var n = get_random_int(3, 300)

	var click_x = []
	var click_y = []
	var drag = []

	for(let i=0; i<n; i++)
	{
		click_x.push(get_random_int(0, 400))
		click_y.push(get_random_int(0, 300))

		if(drag.length === 0)
		{
			drag.push(false)
		}

		else
		{
			drag.push(get_random_int(0, 2) > 0)
		}
	}

	return [click_x, click_y, drag]
}

function get_twitch_stream()
{
	fetch(`https://api.twitch.tv/helix/streams`,
	{
		headers:
		{
			"Client-ID": twitch_client_id
		}
	})
	
	.then(res => 
	{
		return res.json()
	})
	
	.then(res => 
	{
		if(res.data && res.data.length > 0)
		{
			let item = res.data[get_random_int(0, res.data.length - 1)]

			fetch(`https://api.twitch.tv/helix/users?id=${item.user_id}`,
			{
				headers:
				{
					"Client-ID": twitch_client_id
				}
			})
			
			.then(res => 
			{
				return res.json()
			})
			
			.then(res => 
			{
				if(res.data && res.data.length > 0)
				{
					let user = res.data[0]

					change_tv(`https://twitch.tv/${user.login}`)
				}
			})

			.catch(err =>
			{
				console.error(err)
			})
		}
	})

	.catch(err =>
	{
		console.error(err)
	})
}

function get_youtube_stream()
{
	fetch(`https://www.googleapis.com/youtube/v3/search?videoEmbeddable=true&maxResults=20&type=video&eventType=live&videoCategoryId=20&fields=items(id(videoId))&part=snippet&key=${youtube_client_id}`)
	
	.then(res => 
	{
		return res.json()
	})
	
	.then(res => 
	{
		if(res.items !== undefined && res.items.length > 0)
		{
			var id = res.items[get_random_int(0, res.items.length - 1)].id.videoId

			change_tv(`https://youtube.com/watch?v=${id}`)
		}
	})

	.catch(err =>
	{
		console.error(err)
	})
}

function is_command(message)
{
	if(message.length > 1 && message[0] === command_prefix && message[1] !== command_prefix)
	{
		return true
	}

	return false
}

// Must Include:
// data.message
// data.username
function process_command(data)
{
	if(!is_admin(data.username))
	{
		return false
	}

	user_command_activity.push(data.username)
	{
		if(user_command_activity.length > 10)
		{
			user_command_activity.shift()
		}
	}

	var a = data.message.split(' ')

	var cmd = a[0]

	if(a.length > 1)
	{
		cmd += ' '

		var arg = clean_string2(a.slice(1).join(" "))
	}

	else
	{
		var arg = ""
	}

	cmd = cmd.substring(1).trim()

	if(data.message.includes(" && "))
	{
		if(cmd !== "set" && cmd !== "setforce")
		{
			let full_cmd = `${cmd} ${arg}`

			let and_split = full_cmd.split(" && ")

			if(and_split.length > 1)
			{
				for(let item of and_split)
				{
					let c = item.trim()

					if(!c.startsWith(command_prefix))
					{
						c = command_prefix + c
					}

					process_command({message:c, username:data.username})
				}

				return false
			}
		}
	}

	if(!available_commands.includes(cmd))
	{
		if(commands[cmd] !== undefined)
		{
			run_command(cmd, arg, data)
		}

		return false
	}

	if(cmd === "image")
	{
		if(!arg)
		{
			return false
		}

		change_image(arg, true)
	}

	else if(cmd === "tv")
	{
		if(!arg)
		{
			return false
		}

		change_tv(arg, true)
	}

	else if(cmd === "radio")
	{
		if(!arg)
		{
			return false
		}

		change_radio(arg, true)
	}

	else if(cmd === "set" || cmd === "setforce")
	{
		var split = arg.split(' ')
		var command_name = split[0]
		var command_type = split[1]
		var command_url = split.slice(2).join(" ")

		if(!arg || split.length < 3 || (!media_types.includes(command_type) && command_type !== "alias"))
		{
			send_message(`Correct format is --> ${command_prefix}${cmd} [name] ${media_types.join("|")}|alias [url]`)
			return false
		}

		if(available_commands.includes(command_name))
		{
			send_message(`Command "${command_name}" is reserved.`)
			return false
		}

		if(command_type === "alias")
		{
			let and_split = command_url.split(" && ")

			for(let item of and_split)
			{
				let c = item.trim().split(" ")[0]

				if(!available_commands.includes(c))
				{
					send_message("Not a valid alias. Remember to not include the trigger character.")
					return false
				}
			}
		}

		var oc = commands[command_name]

		if(oc && cmd !== "setforce")
		{
			send_message(`"${command_name}" already exists. Use "${command_prefix}setforce" to overwrite.`)
			return false
		}

		var testobj = {}

		try
		{
			testobj[command_name] = {type:command_type, url:command_url}
			commands[command_name] = {type:command_type, url:command_url}

			save_file("commands.json", commands, function(err)
			{
				send_message(`Command "${command_name}" successfully set.`)
			})
		}

		catch(err)
		{
			send_message(`Can't save that command.`)
			return false
		}
	}

	else if(cmd === "unset")
	{
		if(!arg)
		{
			send_message(`Correct format is --> ${command_prefix}unset [name]`)
			return false
		}

		if(commands[arg] === undefined)
		{
			send_message(`Command "${arg}" doesn't exist.`)
			return false
		}

		delete commands[arg]

		save_file("commands.json", commands, function(err)
		{
			send_message(`Command "${arg}" successfully unset.`)
		})
	}

	else if(cmd === "rename")
	{
		var split = arg.split(' ')
		var old_name = split[0]
		var new_name = split[1]

		if(!arg || split.length !== 2)
		{
			send_message(`Correct format is --> ${command_prefix}rename [old_name] [new_name]`)
			return false
		}

		if(commands[old_name] === undefined)
		{
			send_message(`Command "${old_name}" doesn't exist.`)
			return false
		}

		try
		{
			commands[new_name] = commands[old_name]

			delete commands[old_name]

			save_file("commands.json", commands, function(err)
			{
				send_message(`Command "${old_name}" successfully renamed to "${new_name}".`)
			})
		}

		catch(err)
		{
			send_message(`Can't rename that command.`)
			return false
		}
	}

	else if(cmd === "list")
	{
		var sort_mode = "random"

		if(arg)
		{
			sort_mode = "sort"
		}

		var s = list_items(
		{
			data: commands,
			filter: arg,
			prepend: command_prefix,
			sort_mode: sort_mode
		})

		if(!s)
		{
			var s = "No commands found."
		}

		send_message(s)
	}

	else if(cmd === "random")
	{
		var cmds = Object.keys(commands)

		cmds = cmds.filter(x => commands[x].type !== "alias")

		if(arg)
		{
			if(!media_types.includes(arg))
			{
				return false
			}
			
			cmds = cmds.filter(x => commands[x].type === arg)
		}

		var c = cmds[get_random_int(0, cmds.length - 1)]

		if(c)
		{
			run_command(c, arg, data)
		}
	}

	else if(cmd === "whatis")
	{
		if(!arg || arg.split(" ").length > 1)
		{
			send_message(`Correct format is --> ${command_prefix}whatis [command_name]`)
			return false
		}

		if(available_commands.includes(arg))
		{
			send_message(`"${arg}" is a reserved command.`)
		}

		else
		{
			var command = commands[arg]

			if(command)
			{
				send_message(`"${arg}" is of type "${command.type}" and is set to "${command.url}".`)
			}

			else
			{
				send_message(`Command "${arg}" doesn't exist.`)
			}
		}
	}

	else if(cmd === "adminadd")
	{
		if(!is_protected_admin(data.username))
		{
			return false
		}

		if(!arg)
		{
			send_message(`Correct format is --> ${command_prefix}adminadd [username]`)
			return false
		}

		if(arg === data.username)
		{
			return false
		}

		if(!permissions.admins.includes(arg))
		{
			permissions.admins.push(arg)

			save_file("permissions.json", permissions, function(err)
			{
				send_message(`Username "${arg}" was successfully added as an admin.`)
			})
		}
	}

	else if(cmd === "adminremove")
	{
		if(!is_protected_admin(data.username))
		{
			return false
		}

		if(!arg)
		{
			send_message(`Correct format is --> ${command_prefix}adminremove [username]`)
			return false
		}

		if(arg === data.username)
		{
			return false
		}
		
		if(permissions.admins.includes(arg))
		{
			for(let i=0; i<permissions.admins.length; i++)
			{
				var admin = permissions.admins[i]

				if(admin === arg)
				{
					permissions.admins.splice(i, 1)
				}
			}

			save_file("permissions.json", permissions, function(err)
			{
				send_message(`Username "${arg}" was successfully removed as an admin.`)
			})
		}

		else
		{
			send_message(`"${arg}" is not an admin. Nothing to remove.`)
		}
	}

	else if(cmd === "admins")
	{
		var sort_mode = "random"

		if(arg)
		{
			sort_mode = "sort"
		}

		var s = list_items(
		{
			data: permissions.admins,
			filter: arg,
			append: ",",
			sort_mode: sort_mode
		})

		if(!s)
		{
			var s = "No admins found."
		}

		send_message(s)
	}

	else if(cmd === "themeadd")
	{
		if(!arg)
		{
			send_message(`Correct format is --> ${command_prefix}themeadd [name]`)
			return false
		}

		var obj = {}

		obj.theme = theme
		obj.text_color = text_color
		obj.text_color_mode = text_color_mode

		themes[arg] = obj

		save_file("themes.json", themes, function()
		{
			send_message(`Theme "${arg}" successfully added.`)
		})
	}

	else if(cmd === "themeremove")
	{
		if(!arg)
		{
			send_message(`Correct format is --> ${command_prefix}themeremove [name]`)
			return false
		}

		if(themes[arg] === undefined)
		{
			send_message(`Theme "${arg}" doesn't exist.`)
			return false
		}

		delete themes[arg]

		save_file("themes.json", themes, function()
		{
			send_message(`Theme "${arg}" successfully removed.`)
		})
	}

	else if(cmd === "themerename")
	{
		var split = arg.split(' ')
		var old_name = split[0]
		var new_name = split[1]

		if(!arg || split.length !== 2)
		{
			send_message(`Correct format is --> ${command_prefix}themerename [old_name] [new_name]`)
			return false
		}

		if(themes[old_name] === undefined)
		{
			send_message(`Theme "${old_name}" doesn't exist.`)
			return false
		}

		try
		{
			themes[new_name] = themes[old_name]

			delete themes[old_name]

			save_file("themes.json", themes, function(err)
			{
				send_message(`Theme "${old_name}" successfully renamed to "${new_name}".`)
			})
		}

		catch(err)
		{
			send_message(`Can't rename that theme.`)
			return false
		}
	}

	else if(cmd === "theme")
	{
		if(role !== "admin" && role !== "op")
		{
			send_message("I need operator status to do this.")
			return false
		}

		if(!arg)
		{
			send_message(`Correct format is --> ${command_prefix}theme [name]`)
			return false
		}

		var obj = themes[arg]

		if(obj)
		{
			if(obj.theme !== theme)
			{
				socket_emit("change_theme", {color:obj.theme})
			}

			if(obj.text_color_mode !== text_color_mode)
			{
				socket_emit("change_text_color_mode", {mode:obj.text_color_mode})
			}

			if(obj.text_color_mode === "custom")
			{
				if(obj.text_color !== text_color)
				{
					socket_emit("change_text_color", {color:obj.text_color})
				}
			}
		}

		else
		{
			send_message(`Theme "${arg}" doesn't exist.`)
		}
	}

	else if(cmd === "themes")
	{
		var sort_mode = "random"

		if(arg)
		{
			sort_mode = "sort"
		}

		var s = list_items(
		{
			data: themes,
			filter: arg,
			append: ",",
			sort_mode: sort_mode
		})

		if(!s)
		{
			var s = "No themes found."
		}

		send_message(s)
	}

	else if(cmd === "linktitles")
	{
		if(!arg || (arg !== "on" && arg !== "off"))
		{
			send_message(`Correct format is --> ${command_prefix}linktitles on|off`)
			return false
		}

		if(arg === "on")
		{
			if(options.link_titles)
			{
				send_message("Link titles are already on.")
				return false
			}

			options.link_titles = true

			save_file("options.json", options, function()
			{
				send_message(`Link titles are now on.`)
			})
		}

		else if(arg === "off")
		{
			if(!options.link_titles)
			{
				send_message("Link titles are already off.")
				return false
			}

			options.link_titles = false

			save_file("options.json", options, function()
			{
				send_message(`Link titles are now off.`)
			})
		}
	}

	else if(cmd === "q")
	{
		var error = false

		var arg1
		var arg1

		if(!arg)
		{
			error = true
		}
		
		else
		{
			var split = arg.split(' ')

			if(split.length < 2)
			{
				error = true
			}

			else
			{
				arg1 = split[0]

				if(!media_types.includes(arg1))
				{
					error = true
				}
				
				else
				{
					arg2 = split.slice(1).join(" ")
				}
			}
		}

		if(error)
		{
			send_message(`Correct format is --> ${command_prefix}q ${media_types.join("|")} [url]|next|clear|size`)
			return false
		}

		if(arg1 === "image")
		{
			var pname = "the image"
			var upname = "Image"
			var perm = can_images
		}

		else if(arg1 === "tv")
		{
			var pname = "the tv"
			var upname = "TV"
			var perm = can_tv
		}

		else if(arg1 === "radio")
		{
			var pname = "the radio"
			var upname = "Radio"
			var perm = can_radio
		}

		if(arg2 === "next")
		{
			if(queue[arg1].length > 0)
			{
				if(!perm)
				{
					send_message(`I don't have permission to change ${pname}.`)
					return false
				}

				var url = queue[arg1].shift()

				if(arg1 === "image")
				{
					change_image(url)
				}

				else if(arg1 === "tv")
				{
					change_tv(url)
				}

				else if(arg1 === "radio")
				{
					change_radio(url)
				}

				save_file("queue.json", queue)
			}

			else
			{
				send_message(`${upname} queue is empty.`)
			}
		}

		else if(arg2 === "clear")
		{
			if(queue[arg1].length > 0)
			{
				queue[arg1] = []

				save_file("queue.json", queue, function()
				{
					send_message(`${upname} queue successfully cleared.`)
				})
			}

			else
			{
				send_message(`${upname} queue was already cleared.`)
			}
		}

		else if(arg2 === "size")
		{
			var n = queue[arg1].length

			if(n === 1)
			{
				var s = "item"
			}

			else
			{
				var s = "items"
			}

			send_message(`${upname} queue has ${n} ${s}.`)
		}

		else
		{
			if(queue[arg1].includes(arg2))
			{
				send_message(`That item is already in the ${arg1} queue.`)
				return false
			}
			
			queue[arg1].push(arg2)

			save_file("queue.json", queue, function()
			{
				send_message(`${upname} item successfully queued.`)
			})	
		}
	}

	else if(cmd === "ping")
	{
		send_message("Pong")
	}

	else if(cmd === "stream")
	{
		if(!twitch_enabled && !youtube_enabled)
		{
			send_message("No stream source support is enabled.")
			return false
		}

		if(twitch_enabled && !youtube_enabled)
		{
			get_twitch_stream()
		}

		else if(youtube_enabled && !twitch_enabled)
		{
			get_youtube_stream()
		}

		else
		{
			var n = get_random_int(0, 1)

			if(n === 0)
			{
				get_twitch_stream()
			}

			else
			{
				get_youtube_stream()
			}
		}
	}

	else if(cmd === "activity")
	{
		var s = list_items(
		{
			data: user_command_activity.slice(0).reverse(),
			append: ","
		})

		if(!s)
		{
			var s = "No activity yet."
		}

		send_message(`Recent command activity by: ${s}`)
	}

	else if(cmd === "clearcommands")
	{
		if(!is_protected_admin(data.username))
		{
			return false
		}

		commands = {}

		save_file("commands.json", commands, function()
		{
			send_message(`Commands list successfully cleared.`)
		})
	}

	else if(cmd === "clearadmins")
	{
		if(!is_protected_admin(data.username))
		{
			return false
		}

		permissions.admins = [data.username]

		save_file("permissions.json", permissions, function()
		{
			send_message(`Admins list successfully cleared.`)
		})
	}

	else if(cmd === "clearthemes")
	{
		if(!is_protected_admin(data.username))
		{
			return false
		}

		themes = {}

		save_file("themes.json", themes, function()
		{
			send_message(`Themes list successfully cleared.`)
		})
	}

	else if(cmd === "help")
	{					
		var s = ""

		s += "Available Commands: "

		for(var c of available_commands)
		{
			s += `${command_prefix}${c}, ` 
		}

		s = s.slice(0, -2)

		send_message(s)
	}
}

function is_protected_admin(uname)
{
	return protected_admins.includes(uname)
}

function is_admin(uname)
{
	return permissions.admins.includes(uname) || is_protected_admin(uname)
}