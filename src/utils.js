module.exports = (App) => {
  App.math = App.i.mathjs.create(App.i.mathjs.all, {
    number: `BigNumber`,
    precision: 64,
  })

  App.is_protected_admin = (uname) => {
    let low_uname = uname.toLowerCase()

    for (let admin of App.db.config.protected_admins) {
      if (admin.toLowerCase() === low_uname) {
        return true
      }
    }

    return false
  }

  App.is_admin = (uname) => {
    let low_uname = uname.toLowerCase()

    for (let admin of App.db.permissions.admins) {
      if (admin.toLowerCase() === low_uname) {
        return true
      }
    }

    return false
  }

  App.shuffle_array = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]
    }
  }

  App.capitalize = (word) => {
    return word[0].toUpperCase() + word.slice(1)
  }

  App.get_random_word = (mode = `normal`) => {
    let word = App.i.sentencer.make(`{{ noun }}`)

    if (mode === `normal`) {
      return word
    }
    else if (mode === `capitalized`) {
      return App.capitalize(word)
    }
    else if (mode === `upper_case`) {
      return word.toUpperCase()
    }
  }

  App.get_random_sentence = (ctx) => {
    let contexts = [
      `I want {{ a_noun }}`,
      `I feel like {{ a_noun }}`,
      `Would you like {{ a_noun }}?`,
      `I'm playing with {{ a_noun }}`,
      `You look like {{ a_noun }}`,
      `You're all a bunch of {{ adjective }} {{ nouns }}`,
      `I want to eat {{ a_noun }}`,
      `I see the {{ noun }}`,
      `Hit the road, shit-smelling {{ nouns }}!`,
      `I bought some {{ nouns }}`,
      `{{ nouns }} are like {{ nouns }}`,
      `Whatever you say Mr. {{ Noun }}`,
      `Whatever you say Ms. {{ Noun }}`,
      `You are kinda {{ adjective }}`,
      `This {{ noun }} is a bit {{ adjective }}`,
      `{{ user }} ate Mr. {{Noun}}`,
      `{{ user }} ate Ms. {{Noun}}`,
      `Hey {{ user }}, what's up?`,
      `{{ user }} is creeping me out right now`,
    ]

    let context = contexts[App.get_random_int(0, contexts.length - 1)]
    return App.do_replacements(ctx, context)
  }

  App.get_random_weird_sentence = () => {
    return App.i.random_sentence({words: App.get_random_int(1, 8)})
  }

  App.safe_replacements = (s) => {
    s = s.replace(/\$user\$/g, `[random user]`)
    s = s.replace(/\$word\$/g, `[random word]`)
    s = s.replace(/\$Word\$/g, `[random Word]`)
    s = s.replace(/\$WORD\$/g, `[random WORD]`)
    return s
  }

  App.get_random_string = (n) => {
    let text = ``
    let possible = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`

    for (let i = 0; i < n; i++) {
      text += possible[App.get_random_int(0, possible.length - 1)]
    }

    return text
  }

  App.string_similarity = (s1, s2) => {
    let longer = s1
    let shorter = s2

    if (s1.length < s2.length) {
      longer = s2
      shorter = s1
    }

    let longer_length = longer.length

    if (longer_length === 0) {
      return 1.0
    }

    return (longer_length - App.string_similarity_distance(longer, shorter)) / parseFloat(longer_length)
  }

  App.string_similarity_distance = (s1, s2) => {
    s1 = s1.toLowerCase()
    s2 = s2.toLowerCase()
    let costs = new Array()

    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i

      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j
        }
        else if (j > 0) {
          let newValue = costs[j - 1]

          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue),
              costs[j]) + 1
          }

          costs[j - 1] = lastValue
          lastValue = newValue
        }
      }

      if (i > 0) {
        costs[s2.length] = lastValue
      }
    }

    return costs[s2.length]
  }

  App.is_admin_or_op = (rol) => {
    return rol === `admin` || rol === `op`
  }

  App.get_random_int = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min)
  }

  App.def_args = (def, args) => {
    for (let key in def) {
      if ((args[key] === undefined) && (def[key] !== undefined)) {
        args[key] = def[key]
      }
    }
  }

  App.list_items = (args = {}) => {
    let def_args = {
      data: {},
      filter: ``,
      prepend: ``,
      append: ``,
      sort_mode: `none`,
      whisperify: false,
      mode: ``,
      limit: true,
    }

    App.def_args(args, def_args)
    args.filter = args.filter.toLowerCase()
    let do_filter = args.filter ? true : false
    let props

    if (Array.isArray(args.data)) {
      props = args.data
    }
    else {
      props = Object.keys(args.data)
    }

    let max

    if (args.limit) {
      max = App.config.max_list_items
    }
    else {
      max = props.length
    }

    if (args.sort_mode === `random`) {
      props = props.map(x => [Math.random(), x]).sort(([a], [b]) => a - b).map(([_, x]) => x)
    }
    else if (args.sort_mode === `sort`) {
      props.sort()
    }

    let i = 0
    let s = ``

    for (let p of props) {
      if (do_filter) {
        if (p.toLowerCase().includes(args.filter)) {
          if (!on_added(p)) {
            break
          }
        }
      }
      else if (!on_added(p)) {
        break
      }
    }

    function on_added(p) {
      i += 1

      if (i > 1 && i < max) {
        s += args.append
      }

      if (i <= max) {
        s += ` `
      }

      let bp = ``

      if (args.mode === `commands`) {
        let cmd = App.db.commands[p]

        if (cmd && cmd.type) {
          bp = ` (${cmd.type})`
        }
      }

      let w = ``
      let w2 = ``

      if (args.whisperify) {
        w = `[whisper ${args.whisperify}${p}]`
        w2 = `[/whisper]`
      }

      let ns = `${w}${args.prepend}${p}${bp}${w2}`

      if (s.length + ns.length > App.config.max_text_length) {
        return false
      }

      s += ns

      if (i >= max) {
        return false
      }

      return true
    }

    return s.trim()
  }

  App.get_extension = (s) => {
    if (s.startsWith(`http://`) || s.startsWith(`https://`)) {
      let s2 = s.split(`//`).slice(1).join(`//`)
      let matches = s2.match(/\/.*\.(\w+)(?=$|[#?])/)

      if (matches) {
        return matches[1]
      }
    }
    else {
      let matches = s.match(/\.(\w+)(?=$|[#?])/)

      if (matches) {
        return matches[1]
      }
    }

    return ``
  }

  App.single_space = (s) => {
    return s.replace(/\s+/g, ` `).trim()
  }

  App.no_space = (s) => {
    return s.replace(/\s+/g, ``).trim()
  }

  App.single_linebreak = (s) => {
    return s.replace(/[\n\r]+/g, `\n`).replace(/\s+$/g, ``)
  }

  App.remove_pre_empty_lines = (s) => {
    let split = s.split(`\n`)
    let counter = 0

    for (let line of split) {
      if (line.trim()) {
        return split.slice(counter).join(`\n`)
      }

      counter += 1
    }
  }

  App.remove_multiple_empty_lines = (s, level = 1) => {
    let ns = []
    let charge = 0
    let split = s.split(`\n`)

    for (let line of split) {
      if (line.trim() === ``) {
        if (charge < level) {
          ns.push(line)
        }

        charge += 1
      }
      else {
        charge = 0
        ns.push(line)
      }
    }

    let pf = ns.join(`\n`)

    return pf
  }

  App.smart_capitalize = (s) => {
    if (s.length > 2) {
      return s[0].toUpperCase() + s.slice(1)
    }

    return s.toUpperCase()
  }

  App.clean_multiline = (message) => {
    let message_split = message.split(`\n`)
    let num_lines = message_split.length

    if (num_lines === 1) {
      message = message.trim()
    }
    else {
      let new_lines = []

      for (let line of message_split) {
        if (line.trim().length > 0) {
          new_lines.push(line)
        }
      }

      message = new_lines.join(`\n`)
    }

    return message
  }

  App.round = (value, decimals) => {
    return Number(Math.round(value + `e` + decimals) + `e-` + decimals)
  }

  App.rgb_to_hex = (rgb, hash = true) => {
    if (typeof rgb === `string`) {
      rgb = App.rgb_to_array(rgb)
    }

    let code = ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1)

    if (hash) {
      code = `#` + code
    }

    return code
  }

  App.rgb_to_array = (rgb) => {
    let array

    if (Array.isArray(rgb)) {
      array = []

      for (let i = 0; i < rgb.length; i++) {
        let split = rgb[i].replace(`rgb(`, ``).replace(`)`, ``).split(`,`)
        array[i] = split.map(x => parseInt(x))
      }
    }
    else {
      let split = rgb.replace(`rgb(`, ``).replace(`)`, ``).split(`,`)
      array = split.map(x => parseInt(x))
    }

    return array
  }

  App.process_feedback = (ctx, data, s) => {
    if (!s) {
      return false
    }

    if (data.method === `whisper`) {
      App.send_whisper(ctx, data.username, s)
    }
    else {
      App.send_message(ctx, s)
    }
  }

  App.get_random_user = (ctx) => {
    return ctx.userlist[App.get_random_int(0, ctx.userlist.length - 1)]
  }

  App.do_replacements = (ctx, s) => {
    function check_word(word, token, m1, m2, m3) {
      if (token === m1) {
        return word
      }
      else if (token === m2) {
        return App.capitalize(word)
      }
      else if (token === m3) {
        return word.toUpperCase()
      }
    }

    s = s.replace(/\{\{\s*user\s*\}\}/gi, () => {
      return App.get_random_user(ctx)
    })

    s = s.replace(/\{\{\s*(noun)\s*\}\}/gi, (a, b) => {
      return check_word(App.i.sentencer.make(`{{ noun }}`), b, `noun`, `Noun`, `NOUN`)
    })

    s = s.replace(/\{\{\s*(a_noun)\s*\}\}/gi, (a, b) => {
      return check_word(App.i.sentencer.make(`{{ a_noun }}`), b, `a_noun`, `A_noun`, `A_NOUN`)
    })

    s = s.replace(/\{\{\s*(nouns)\s*\}\}/gi, (a, b) => {
      return check_word(App.i.sentencer.make(`{{ nouns }}`), b, `nouns`, `Nouns`, `NOUNS`)
    })

    s = s.replace(/\{\{\s*(adjective)\s*\}\}/gi, (a, b) => {
      return check_word(App.i.sentencer.make(`{{ adjective }}`), b, `adjective`, `Adjective`, `ADJECTIVE`)
    })

    return s
  }

  App.set_media_sources = (ctx, data) => {
    let tv_done = false
    let image_done = false

    for (let m of data.log_messages.slice(0).reverse()) {
      if (!tv_done && m.type === `tv`) {
        App.set_tv_source(ctx, m.data.source)
        tv_done = true
      }

      if (!image_done && m.type === `image`) {
        App.set_image_source(ctx, m.data.source)
        image_done = true
      }

      if (tv_done && image_done) {
        break
      }
    }
  }

  App.set_username = (ctx, uname) => {
    ctx.username = uname
    ctx.greet_pattern = new RegExp(`^\\s*(hi|hello)\\s+${uname}\\s*$|^\\s*${uname}\\s+(hi|hello)\\s*$`, `i`)
  }

  App.set_role = (ctx, rol) => {
    ctx.role = rol
  }

  App.check_reminders = (ctx, uname) => {
    if (App.db.reminders[uname] === undefined || App.db.reminders[uname].length === 0) {
      return false
    }

    for (let reminder of App.db.reminders[uname]) {
      let s = `To: ${uname} - From: ${reminder.from}\n"${reminder.message}"`
      App.send_message(ctx, s)
    }

    App.db.reminders[uname] = []
    App.save_file(`reminders.json`, App.db.reminders)
  }

  App.speeches = {
    1: (ctx, data) => App.send_message(ctx, App.get_random_sentence(ctx)),
    2: (ctx, data) => App.send_message(ctx, App.get_random_weird_sentence()),
    3: (ctx, data) => App.get_random_4chan_post({ctx, data}),
    4: (ctx, data) => App.send_message(ctx, `it's over`),
  }

  App.check_speech = (ctx, data, arg) => {
    let p = Math.min(100, App.db.config.speak_chance_percentage)

    if (p <= 0) {
      return
    }

    let n = App.get_random_int(1, 100)

    if (n <= p) {
      setTimeout(() => {
        let modes = App.db.config.speak_modes

        if (modes.length === 0) {
          return
        }

        let mode = modes[App.get_random_int(0, modes.length - 1)]
        let speech = App.speeches[mode]

        if (speech) {
          speech(ctx, data)
        }
      }, 1000)
    }
  }

  App.selective_play = (ctx, kind, url, comment = ``) => {
    if (kind === `image`) {
      App.change_media(ctx, {
        type: `image`,
        src: url,
        comment,
      })
    }
    else if (kind === `tv`) {
      App.change_media(ctx, {
        type: `tv`,
        src: url,
        comment,
      })
    }
  }

  App.get_youtube_stream = (ctx) => {
    App.log(`Fetching Youtube...`)

    App.i.fetch(`https://www.googleapis.com/youtube/v3/search?videoEmbeddable=true&maxResults=20&type=video&eventType=live&videoCategoryId=20&fields=items(id(videoId))&part=snippet&key=${App.db.config.youtube_client_id}`)
      .then(res => {
        return res.json()
      })
      .then(res => {
        if (res.items !== undefined && res.items.length > 0) {
          App.shuffle_array(res.items)
          let item

          for (item of res.items) {
            if (!ctx.recent_youtube_streams.includes(item.id.videoId)) {
              break
            }
          }

          let id = item.id.videoId
          ctx.recent_youtube_streams.push(id)

          if (ctx.recent_youtube_streams.length > App.config.recent_streams_max_length) {
            ctx.recent_youtube_streams.shift()
          }

          App.change_media(ctx, {
            type: `tv`,
            src: `https://youtube.com/watch?v=${id}`,
          })
        }
      })
      .catch(err => {
        App.log(err, `error`)
      })
  }

  App.find_closest = (s, list) => {
    let highest_num = 0
    let highest_cmd = ``

    for (let s2 of list) {
      let num = App.string_similarity(s, s2)

      if (num > highest_num) {
        highest_num = num
        highest_cmd = s2
      }
    }

    if (highest_num >= 0.7) {
      return highest_cmd
    }

    return ``
  }

  App.get_media_name = (media) => {
    let name = ``

    if (media === `image`) {
      name = `Image`
    }
    else if (media === `tv`) {
      name = `TV`
    }

    return name
  }

  App.check_if_media = (s) => {
    return s === `image` || s === `tv`
  }

  // Get id of youtube video from url
  App.get_youtube_id = (url) => {
    let v_id = false
    let list_id = false
    let split = url.split(/(vi\/|v%3D|v=|\/v\/|youtu\.be\/|\/embed\/)/)
    let id = undefined !== split[2] ? split[2].split(/[^0-9a-z_-]/i)[0] : split[0]
    v_id = id.length === 11 ? id : false
    let list_match = url.match(/(?:\?|&)(list=[0-9A-Za-z_-]+)/)
    let index_match = url.match(/(?:\?|&)(index=[0-9]+)/)

    if (list_match) {
      list_id = list_match[1].replace(`list=`, ``)
    }

    if (list_id && !v_id) {
      let index = 0

      if (index_match) {
        index = parseInt(index_match[1].replace(`index=`, ``)) - 1
      }

      return [`list`, [list_id, index]]
    }
    else if (v_id) {
      return [`video`, v_id]
    }
  }

  // Centralized log function
  /* eslint-disable no-console */
  App.log = (message, mode = `normal`) => {
    if (mode === `error`) {
      console.error(message)
    }
    else {
      console.info(`🟢 ${message}`)
    }
  }

  App.is_gpt = (model) => {
    return model.startsWith(`gpt-`)
  }

  App.is_gemini = (model) => {
    return model.startsWith(`gemini-`)
  }

  App.is_url = (value) => {
    return value.startsWith(`https://`) || value.startsWith(`http://`)
  }

  App.download = async (args = {}) => {
    let def_args = {
      on_finish: () => {},
      on_error: () => {},
    }

    App.def_args(args, def_args)
    App.log(`Downloading: ${args.url}`)

    try {
      let response = await App.i.axios({
        url: args.url,
        responseType: `stream`,
      })

      let full_path = App.i.path.join(App.files_path, args.path)
      let writer = await App.i.fs.createWriteStream(full_path)
      response.data.pipe(writer)
      writer.on(`finish`, args.on_finish)
      writer.on(`error`, args.on_error)
    }
    catch (err) {
      App.log(err)
    }
  }
}