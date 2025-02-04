module.exports = (App) => {
  App.manage_queue = (ox) => {
    let args = ox.arg.split(` `)

    if (!args[0]) {
      App.process_feedback(ox.ctx, ox.data, `Correct format is --> ${App.prefix}${ox.cmd} url`)
      return false
    }

    if ((args[0] !== `remove`) && (args[0] !== `play`)) {
      ox.arg = App.tv_default(ox.arg, args[0])
      args = ox.arg.split(` `)
    }

    if (args[0] === `remove`) {
      App.remove_queue_item(ox)
    }
    else if (args[0] === `play`) {
      App.play_specific_queue_item(ox)
    }
    else if (args[1] === `next`) {
      App.next_in_queue(ox)
    }
    else if (args[1] === `clear`) {
      App.clear_queue(ox)
    }
    else if (args[1] === `size`) {
      App.get_queue_size(ox)
    }
    else if (args[1] === `list`) {
      App.list_queue(ox)
    }
    else if (args[1] === `help`) {
      App.process_feedback(ox.ctx, ox.data, `${App.prefix}${ox.cmd} url or next, size, list, clear`)
    }
    else {
      App.add_to_queue(ox)
    }
  }

  App.list_queue = (ox) => {
    let args = ox.arg.split(` `)
    let queue = App.db.queue[args[0]]
    let list = queue.slice(0, 5).map(x => x.url).join(`\n`)
    App.process_feedback(ox.ctx, ox.data, `${App.get_media_name(args[0])} queue:\n${list}`)
  }

  App.remove_queue_item = (ox) => {
    let args = ox.arg.split(` `)

    if (App.get_q_item(args[1], `delete`)) {
      if (args[2]) {
        App.delete_message(ox.ctx, args[2])
      }
    }
    else {
      App.process_feedback(ox.ctx, ox.data, `This was already played or removed.`)
    }
  }

  App.play_specific_queue_item = (ox) => {
    let args = ox.arg.split(` `)
    let item = App.get_q_item(args[1], `delete`)

    if (item) {
      if (args[2]) {
        App.delete_message(ox.ctx, args[2])
      }

      App.selective_play(ox.ctx, item.kind, item.url, `Selected by ${item.username}`)
      App.save_file(`queue.json`, App.db.queue)
    }
    else {
      App.process_feedback(ox.ctx, ox.data, `This was already played or removed.`)
    }
  }

  App.next_in_queue = (ox) => {
    let args = ox.arg.split(` `)

    if (App.db.queue[args[0]].length > 0) {
      if (Date.now() - ox.ctx[`q_${args[0]}_cooldown`] < 3000) {
        App.log(`Queue cooldown hit`)
        return false
      }

      let item = App.db.queue[args[0]].shift()

      if (typeof item !== `object`) {
        return
      }

      App.selective_play(ox.ctx, item.kind, item.url, `Selected by ${item.username}`)
      ox.ctx[`q_${args[0]}_cooldown`] = Date.now()
      App.save_file(`queue.json`, App.db.queue)
    }
    else {
      App.process_feedback(ox.ctx, ox.data, `${App.get_media_name(args[0])} queue is empty.`)
    }
  }

  App.clear_queue = (ox) => {
    let args = ox.arg.split(` `)

    if (App.db.queue[args[0]].length > 0) {
      App.db.queue[args[0]] = []

      App.save_file(`queue.json`, App.db.queue, () => {
        App.like_message(ox)
      })
    }
    else {
      App.process_feedback(ox.ctx, ox.data, `${App.get_media_name(args[0])} queue was already cleared.`)
    }
  }

  App.get_queue_size = (ox) => {
    let args = ox.arg.split(` `)
    let n = App.db.queue[args[0]].length
    let s

    if (n === 1) {
      s = `item`
    }
    else {
      s = `items`
    }

    App.process_feedback(ox.ctx, ox.data, `${App.get_media_name(args[0])} queue has ${n} ${s}.`)
  }

  App.add_to_queue = (ox) => {
    let args = ox.arg.split(` `)

    if (App.db.queue[args[0]].includes(args[1])) {
      App.process_feedback(ox.ctx, ox.data, `That item is already in the ${args[0]} queue.`)
      return false
    }

    let obj = {}
    obj.kind = args[0]
    obj.url = args.slice(1).join(` `)
    obj.date = Date.now()
    obj.id = `${obj.kind}_${obj.date}_${App.get_random_string(4)}`
    obj.username = ox.data.username
    App.db.queue[args[0]].push(obj)

    App.save_file(`queue.json`, App.db.queue, () => {
      let links = `[whisper ${App.prefix}q remove ${obj.id} $id$]Remove[/whisper]`
      links += ` | [whisper ${App.prefix}q play ${obj.id} $id$]Play[/whisper]`
      let ans = `Done >> ${links}`
      App.process_feedback(ox.ctx, ox.data, ans)
    })
  }

  App.get_q_item = (id, op = `normal`) => {
    let media = id.split(`_`)[0]

    if (!App.check_if_media(media)) {
      return false
    }

    let i = 0

    for (let item of App.db.queue[media]) {
      if (item.id === id) {
        if (op === `delete`) {
          App.db.queue[media].splice(i, 1)
        }

        return item
      }

      i += 1
    }

    return false
  }
}