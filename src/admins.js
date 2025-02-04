module.exports = (App) => {
  App.manage_admins = (ox) => {
    let args = ox.arg.split(` `)

    if (!args[0]) {
      ox.arg = args.slice(1).join(` `)
      App.list_admins(ox)
    }
    else if (args[0] === `add`) {
      ox.arg = args.slice(1).join(` `)
      App.add_admin(ox)
    }
    else if (args[0] === `remove`) {
      ox.arg = args.slice(1).join(` `)
      App.remove_admin(ox)
    }
    else if (args[0] === `help`) {
      App.process_feedback(ox.ctx, ox.data, `[name] or: add, remove, clear`)
    }
    else if (args[0] === `clear`) {
      ox.arg = ``
      App.clear_admins(ox)
    }
  }

  App.add_admin = (ox) => {
    if (!App.is_protected_admin(ox.data.username)) {
      return false
    }

    if (!ox.arg) {
      App.process_feedback(ox.ctx, ox.data, `Correct format is --> ${App.prefix}${ox.cmd} [username]`)
      return false
    }

    if (ox.arg === ox.data.username) {
      return false
    }

    if (!App.db.permissions.admins.includes(ox.arg)) {
      App.db.permissions.admins.push(ox.arg)

      App.save_file(`permissions.json`, App.db.permissions, (err) => {
        App.process_feedback(ox.ctx, ox.data, `Username "${ox.arg}" was successfully added as an admin.`)
      })
    }
  }

  App.remove_admin = (ox) => {
    if (!App.is_protected_admin(ox.data.username)) {
      return false
    }

    if (!ox.arg) {
      App.process_feedback(ox.ctx, ox.data, `Correct format is --> ${App.prefix}${ox.cmd} [username]`)
      return false
    }

    if (ox.arg === ox.data.username) {
      return false
    }

    if (App.db.permissions.admins.includes(ox.arg)) {
      for (let i = 0; i < App.db.permissions.admins.length; i++) {
        let admin = App.db.permissions.admins[i]

        if (admin === ox.arg) {
          App.db.permissions.admins.splice(i, 1)
        }
      }

      App.save_file(`permissions.json`, App.db.permissions, (err) => {
        App.process_feedback(ox.ctx, ox.data, `Username "${ox.arg}" was successfully removed as an admin.`)
      })
    }
    else {
      App.process_feedback(ox.ctx, ox.data, `"${ox.arg}" is not an admin. Nothing to remove.`)
    }
  }

  App.list_admins = (ox) => {
    let sort_mode = `random`

    if (ox.arg) {
      sort_mode = `sort`
    }

    let s = App.list_items({
      data: App.db.permissions.admins,
      filter: ox.arg,
      append: `,`,
      sort_mode,
    })

    if (!s) {
      s = `No admins found.`
    }

    App.process_feedback(ox.ctx, ox.data, s)
  }

  App.clear_admins = (ox) => {
    if (!App.is_protected_admin(ox.data.username)) {
      return false
    }

    App.db.permissions.admins = [ox.data.username]

    App.save_file(`permissions.json`, App.db.permissions, () => {
      App.process_feedback(ox.ctx, ox.data, `Admins list successfully cleared.`)
    })
  }
}