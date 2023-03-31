# Requirements

NodeJS 10+

# Installation

To use simply do "npm install" inside the directory, change the details in huebot.js, then run huebot.js with node.

# Configuration

The following are the details that should be edited in /files/config.json

>bot_email

The bot's account email, used to log in.

>bot_password

The bot's account password, used to log in.

>youtube_client_id

A YouTube dev api client id so YouTube based features can work.

>youtube_enabled

If false, it will avoid using YouTube altogether.

>server_address

The address of the Hue server.

>room_ids

List of rooms to connect at startup.

>protected_admins

These is the list of "superusers". 

These are admins that can't be removed through commands. 

Only they can add or remove more normal admins.

Can't be edited programatically, it's hardcoded.

>files_location

This is if you want to have multiple bots sharing the same files.

You can set this to a specific shared location.

>command_prefix

The character to trigger/identify commands.

>speak_chance_percentage

50 would be 50% chance to make the chat speak on each message. 1 is a good default.

>speak_modes

1 to 4. Different kinds of responses.

1 = Shower Thought
2 = Random Sentence
3 = Random Weird Sentence
4 = Random Post

>wolfram_id

Id to use the Wolfram api

>wolfram_enabled

Whether Wolfram features are enabled.

>openai_enabled

Whether to start and use openai

>openai_key

secret openai api key

>check_rss

Whether to check rss for news.

>check_rss_delay

Check rss every x minutes.

>rss_urls

The rss urls to check.

It has a special format where options can be given at the end:

Modes available are "text", "link", and "bullet". They can be combined.

("bullet" simply adds a "• " at the start of the text)

`someurl link` or `someurl text` or `someurl text,link` or `someurl text,bullet`

This specifies what to output.

# Replacements

Strings in some cases can get replaced to certain things depending on the keyword.

For instance ".tv blue $word$" could search youtube for "blue bird".

These replacements happen at the moment of sending a message or changing media.

These replacements exist:

{{ user }}
{{ noun }}
{{ a_noun }}
{{ nouns }}
{{ adjective }}
{{ an_adjective }}

# More

The bot accepts and processes private messages (whispers) if the user is an admin.

Which can be useful to make more direct calls to the bot (without spamming the chat).

For instance "/whisper2 myBot > .q tv next".

The bot can join multiple rooms at startup if the id is included in room_ids. To join or leave rooms after it's started you can use .join or .leave

# Commands

To find out about available commands, use .help