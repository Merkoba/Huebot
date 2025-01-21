module.exports = (App) => {
  App.start_ai = () => {
    App.ai_working = false
    App.openai_started = false
    App.google_started = false

    if (App.db.config.ai_enabled) {
      App.start_openai()
      App.start_google()
    }
  }

  App.start_openai = () => {
    let key = process.env.OPENAI_API_KEY

    if (!key) {
      return
    }

    App.openai_client = new App.i.openai({
      apiKey: key,
    })

    App.openai_started = true
    App.log(`OpenAI started`)
  }

  App.start_google = () => {
    let key = process.env.GOOGLE_API_KEY

    if (!key) {
      return
    }

    App.google_client = new App.i.openai({
      apiKey: process.env.GOOGLE_API_KEY,
      baseURL: `https://generativelanguage.googleapis.com/v1beta/openai/`,
    })

    App.google_started = true
    App.log(`Google started`)
  }

  App.get_ai_client = (channel) => {
    let model = App.db.config.model

    if (App.is_gpt(model)) {
      if (!App.openai_started) {
        App.log(`OpenAI API Key is missing.`)
        return
      }

      return App.openai_client
    }
    else if (App.is_gemini(model)) {
      if (!App.google_started) {
        App.log(`Google API Key is missing.`)
        return
      }

      return App.google_client
    }
  }

  App.ask_ai = async (ox) => {
    if (!App.db.config.ai_enabled) {
      return
    }

    if (App.ai_working) {
      return
    }

    if (!ox.arg) {
      return
    }

    if (ox.arg.length > 300) {
      return
    }

    try {
      let model = App.db.config.model
      let client = App.get_ai_client()

      if (!client) {
        return
      }

      App.log(`Asking AI (${model})`)

      let messages = []
      let prompt = ox.arg.trim()
      let words = App.db.config.words
      let rules = App.db.config.rules
      let sysprompt = `Respond in ${words} words or less.`

      if (rules) {
        sysprompt += ` ${rules}`
      }

      sysprompt = sysprompt.substring(0, 500).trim()
      messages.push({role: `system`, content: sysprompt})

      if (prompt === App.db.config.continue) {
        prompt = `Please continue.`
      }
      else if (prompt === App.db.config.explain) {
        prompt = `Please explain.`
      }
      else if (prompt === App.db.config.emphasize) {
        prompt = `Please emphasize the last point.`
      }

      // If the prompt starts with the 'clear' symbol no history will be used
      // This symbol is usually "^" and is used at the start of the prompt
      // This is useful when you want to ask a fresh question
      // The history is emptied. Filled again later normally
      let clear = prompt.startsWith(App.db.config.clear)

      if (clear) {
        App.ai_history = []
        let char = App.escape_regex(App.db.config.clear)
        let regex = new RegExp(`^${char}\\s*`)
        prompt = prompt.replace(regex, ``)
      }
      else {
        for (let item of App.ai_history) {
          messages.push({role: `user`, content: item.user})
          messages.push({role: `assistant`, content: item.ai})
        }
      }

      messages.push({role: `user`, content: prompt})
      App.ai_working = true

      let ans = await client.chat.completions.create({
        model,
        max_completion_tokens: App.db.config.max_tokens,
        messages,
      })

      if (ans && ans.choices) {
        let text = ans.choices[0].message.content.trim()

        if (text) {
          App.process_feedback(ox.ctx, ox.data, text)
        }

        let item = {
          user: prompt,
          ai: text,
        }

        if (App.db.config.history <= 0) {
          App.ai_history = []
        }
        else {
          App.ai_history.push(item)
          App.ai_history = App.ai_history.slice(-App.db.config.history)
        }
      }

      App.ai_working = false
    }
    catch (err) {
      App.log(`AI chat error`, `error`)
      App.log(err.message, `error`)
      App.ai_working = false
    }
  }

  App.generate_image = async (ox) => {
    if (!App.db.config.ai_enabled) {
      return
    }

    if (App.ai_working) {
      return
    }

    if (!ox.arg) {
      return
    }

    if (ox.arg.length > 300) {
      return
    }

    try {
      let client = App.openai_client

      if (!client) {
        return
      }

      App.log(`Generating Image`)
      let messages = []
      let prompt = ox.arg.trim()
      messages.push({role: `system`, content: `Respond in 100 words or less`})
      messages.push({role: `user`, content: prompt})

      let model = `dall-e-3`
      let size = `1024x1024`
      App.ai_working = true

      let ans = await client.images.generate({
        n: 1,
        model,
        size,
        prompt,
      })

      if (ans && ans.data) {
        let src = ans.data[0].url

        if (src) {
          App.change_media(ox.ctx, {
            type: `image`,
            comment: prompt,
            src,
          })
        }
      }

      App.ai_working = false
    }
    catch (err) {
      App.log(`AI image error`, `error`)
      App.ai_working = false
    }
  }

  App.reset_ai_history = () => {
    if (App.db.config.history <= 0) {
      App.ai_history = []
    }
    else {
      App.ai_history = App.ai_history.slice(-App.db.config.history)
    }
  }
}