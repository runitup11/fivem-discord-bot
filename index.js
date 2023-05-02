const { Client, MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu, Permissions, Util } = require('discord.js')
var commands;

const Cache = require('file-system-cache').default

const cache = Cache({
    basePath: ".cache",
    ns: "cache"
});


const { token, server, roles, channels, guildid} = require('./config.json')
const fetch = require("node-fetch")

const crypto = import('crypto')
const log = console.log;

const client = new Client({
    intents: ['GUILDS', 'GUILD_MEMBERS', 'GUILD_BANS', 'GUILD_EMOJIS_AND_STICKERS', 'GUILD_INTEGRATIONS', 'GUILD_WEBHOOKS', 'GUILD_INVITES', 'GUILD_VOICE_STATES', 'GUILD_PRESENCES', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'GUILD_MESSAGE_TYPING', 'DIRECT_MESSAGES', 'DIRECT_MESSAGE_REACTIONS', 'DIRECT_MESSAGE_TYPING', 'GUILD_SCHEDULED_EVENTS'],
    partials: ['USER', 'REACTION', 'MESSAGE', 'GUILD_SCHEDULED_EVENT', 'GUILD_MEMBER', 'CHANNEL']
})

client.on('guildMemberAdd', (member) => {
    let members = member.guild.memberCount
    let channel = client.channels.cache.get(channels.powitania)
    const embed = new MessageEmbed().setAuthor({name: 'Nowy użytkownik'}).setThumbnail(member.user.displayAvatarURL({ dynamic: true })).setColor('#74F625').setFooter({ text: 'SativaRP.eu', iconURL: client.user.displayAvatarURL()}).setTimestamp().setDescription(`Witaj ${member.user.tag}, jako nowego użytkownika serwera zapraszamy cie do zapoznania sie z regulaminem!`).addField('Jesteś naszym:', members + ' użytkownikiem')
    channel.send({ content: '<@' + member.id + '>', embeds: [embed]})
    let ch = member.guild.channels.cache.get(channels.nowy); let ch2 = member.guild.channels.cache.get(channels.osobylicznik)
    ch.setName('Nowy: ' + member.user.username); ch2.setName(`Ilość osób: ${member.guild.memberCount}`)
    member.roles.add(roles.obywatel)
})

function resolveString(data){if(typeof data==='string')return data;if(Array.isArray(data))return data.join('\n');return String(data)}
function splitMessage(text,{maxLength=2000,char='\n',prepend='',append=''}={}){text=resolveString(text);if(text.length<=maxLength)return[text];const splitText=text.split(char);if(splitText.some(chunk=>chunk.length>maxLength))throw new RangeError('SPLIT_MAX_LEN');const messages=[];let msg='';for(const chunk of splitText){if(msg&&(msg+char+chunk+append).length>maxLength){messages.push(msg+append);msg=prepend}msg+=(msg&&msg!==prepend?char:'')+chunk}return messages.concat(msg).filter(m=>m)}
function y() {
    if (server.autostatus == false) return;
    if (server.autostatus !== false && server.autostatus !== true) return console.log('[AUTOSTATUS] ') + ('Podana wartość jest nie właściwa!')
    if (!server.ip || !server.port) return console.log('[AUTOSTATUS] ') + ('Ustaw IP serwera w configu lub PORT!')
    fetch(`http://${server.ip}:${server.port}/players.json`).then((res) => res.json()).then((body) => { // players json
        fetch(`http://${server.ip}:${server.port}/info.json`).then((res2) => res2.json()).then((body2) => { // info json
            let max = body2.vars.sv_maxClients
            let players = body.length
            client.user.setActivity("「" + players + "/" + max + "」 ")
        }).catch((err) => {
            console.log("blad przy polaczeniu #2: ", err)
            setTimeout(() => {
                client.user.setActivity("off")
            }, 4000)
        })
    }).catch((err) => {
        console.log("blad przy polaczeniu #1: ", err)
        setTimeout(() => {
            client.user.setActivity("off")
        }, 4000)
    });
}

let rankingData = {
    killsMessageID: 0,
    hoursMessageID: 0,
};

let rankingCache = {
    killMessage: null,
    hoursMessage: null
}

async function __refreshRanking() {
    const guild = await client.guilds.fetch(guildid);

    const killsUpdatePromise = await new Promise(async(resolve) => {
        try {
            const hiddenKillsChannel = await guild.channels.fetch(channels.topkillshidden)
            try {
                let lastMessage = await hiddenKillsChannel.messages.fetch({ limit: 1 })
                lastMessage = lastMessage.first();

                if(lastMessage.webhookId){
                    rankingCache.killMessage.edit({ content: " ", embeds: lastMessage.embeds })
                } else {
                    log("Couldn't get last message from hidden kills ranking!")
                }

                resolve(true)
            } catch(err) {
                console.log(err)
                log('Hidden kills ranking message not found, refresh failed!')
                resolve(false)
            }
        } catch(err) {
            log('Hidden kills channel not found, refresh failed!')
            resolve(false)
        }
    })

    if(!killsUpdatePromise) return;

    await new Promise(async(resolve) => {
        try {
            const hiddenHoursChannel = await guild.channels.fetch(channels.topgodzinhidden)
            try {
                let lastMessage = await hiddenHoursChannel.messages.fetch({ limit: 1 })
                lastMessage = lastMessage.first();

                if(lastMessage.webhookId){
                    rankingCache.hoursMessage.edit({ content: " ", embeds: lastMessage.embeds })
                } else {
                    log("Couldn't get last message from hidden hours ranking!")
                }

                resolve(true)                
            } catch(err) {
                console.log(err)
                log('Hidden hours ranking message not found, refresh failed!')
                resolve(false)
            }
        } catch(err) {
            log('Hidden hours channel not found, refresh failed!')
            resolve(false)
        }
    })
}

async function __checkChannels() {
    const guild = await client.guilds.fetch(guildid);

    // -- KILLS CHANNEL -- //
    const killsPromise = await new Promise(async(resolve) => {
        try {
            const killsChannel = await guild.channels.fetch(channels.topkills)
            try {
                let killMessage = await killsChannel.messages.fetch(rankingData.killsMessageID)
                rankingCache.killMessage = killMessage
                resolve(true)
            } catch(err) {
                log('Kills ranking message not found, creating..')

                const killMessage = await killsChannel.send('TBA')
                rankingData.killsMessageID = killMessage.id
                rankingCache.killMessage = killMessage

                resolve(true)
            }
        } catch(err) {
            log('Kills channel not found, init failed!')
            resolve(false)
        }
    })

    if(!killsPromise) return;

    // -- HOURS CHANNEL -- //
    const hoursPromise = await new Promise(async(resolve) => {
        try {
            const hoursChannel = await guild.channels.fetch(channels.topgodzin)
            try {
                let hoursMessage = await hoursChannel.messages.fetch(rankingData.hoursMessageID)
                rankingCache.hoursMessage = hoursMessage

                resolve(true)
            } catch(err) {
                log('Hours ranking message not found, creating..')

                const hoursMessage = await hoursChannel.send('TBA')
                rankingData.hoursMessageID = hoursMessage.id
                rankingCache.hoursMessage = hoursMessage

                resolve(true)
            }
        } catch(err) {
            log('Hours channel not found, init failed!')
            resolve(false)
        }
    })

    if(!hoursPromise) return;
    cache.set("TOFFY_RANKING", JSON.stringify(rankingData))

    __refreshRanking()
    setInterval(__refreshRanking, 30000)
}

async function __initRanking(){
    cache.get("TOFFY_RANKING")
    .then(result => {
        rankingData = JSON.parse(result)
        __checkChannels()
    }).catch(__checkChannels)

}

client.on('ready', () => {
    console.clear(); log('bot is alive ') + (`[${client.user.tag}]`)
    __initRanking()
    const guild = client.guilds.cache.get(guildid);
    setInterval(y, 5000)
    if(guild) commands = guild.commands; else commands = client.application.commands;
    commands.create({name: 'siema', description: 'przywitaj sie'})
    commands.create({name: 'clear', description: 'Wyczyść kanał z wiadomości!', options: [{name: 'num', description: 'Wskaż ile wiadomości ma usunąć!', required: true, type: 3}]})
    commands.create({name: 'nadajwl', description: 'Nadaj użytkownikowi role whitelist', options: [{name: 'id', description: 'ID użytkownika który ma dostać role', required: true, type: 3}]})
    commands.create({name: 'losujwl', description: 'Wylosuj użytkownika z poczekalni!'})
    commands.create({name: 'changelog', description: 'Wypisz changelog na kanale!', options: [{name: 'content', description: 'Treść changelogu', required: true, type: 3}]})
    commands.create({name: 'ban', description: 'Zbanuj użytkownika z serwera!', options: [{name: 'id', description: 'ID użytkownika', required: true, type: 3}, {name: 'powod', description: 'Powód bana', required: true, type: 3}]})
    commands.create({name: 'przerwa', description: 'Nałóż przerwę na użytkownika!', options: [{name: 'id', description: 'ID użytkownika', required: true, type: 3}, {name: 'powod', description: 'Powód przerwy', required: true, type: 3}, {name: 'czas', description: 'Czas przerwy(w minutach)', required: true, type: 3}]})
})

client.on('messageCreate', async (message) => {
    if(message.guildId == null && !message.author.bot) return message.reply('dont dm me idiot');
    if(message.content == 'vsetup' && message.author.id == '1056694389042319410') {
        const button = new MessageActionRow().addComponents(new MessageButton().setCustomId('vbutton').setLabel('Zweryfikuj się!').setStyle('PRIMARY'))
        let verifychannel = client.channels.cache.get(channels.weryfikacja)
        let embed = new MessageEmbed().setAuthor({name: 'Weryfikacja'}).setColor('#74F625').setDescription('Naciśnij przycisk poniżej aby sie zweryfikować!').setFooter({text:'', iconURL: client.user.displayAvatarURL()})
        verifychannel.send({embeds: [embed], components: [button]})
    }
    if(message.channel.id == channels.propozycje) {
        if(message.author.bot) return
        let embed = new MessageEmbed().setAuthor({name: message.author.tag, iconURL: message.member.displayAvatarURL({ dynamic: true})}).setColor('#74F625').setDescription(message.content).setFooter({text:'SativaRP.eu', iconURL: client.user.displayAvatarURL()})
        message.channel.send({embeds: [embed]}).then((msg) => {
            msg.react('✅'); msg.react('❌')
        })
        setTimeout(() => {message.delete()}, 500)
    }
    if(message.content.includes('discord.gg/') || (message.content.includes('https://') && !message.content.includes('https://tenor.com') && !message.content.includes('https://imgur.com')) || message.content.includes('http://')) {
        if(message.member.roles.cache.has(roles.administracja) || message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return
        message.delete()
    }
    if(message.content == 'rsetup') {
        const row = new MessageActionRow()
        .addComponents(
            new MessageSelectMenu()
                .setCustomId('select')
                .setPlaceholder('Wybierz role!')
                .addOptions([
                    {
                        label: 'Skrzynki',
                        description: 'Ping o skrzynkach',
                        value: 'skrzynkiping',
                    },
                    {
                        label: 'Changelog',
                        description: 'Otrzymaj powiadomienie o zmianach!',
                        value: 'changelog',
                    },
                    {
                        label: 'Eventy',
                        description: 'Otrzymaj powiadomienie o eventach!',
                        value: 'eventy',
                    },
                    {
                        label: 'Restarty',
                        description: 'Otrzymaj powiadomienie o restartach!',
                        value: 'restarty',
                    },
                ]),
        );

        let embed = new MessageEmbed().setAuthor({name: 'Wybierz role'}).setColor('#74F625').setFooter({ text: 'SativaRP.eu', iconURL: client.user.displayAvatarURL()}).setTimestamp()
        message.channel.send({embeds: [embed], components: [row]})
    }
    if(message.content == 'setuptickets') {
        const row = new MessageActionRow()
        .addComponents(
            new MessageSelectMenu()
                .setCustomId('ticket')
                .setPlaceholder('Stwórz ticket')
                .addOptions([
                    {
                        label: 'Pytanie',
                        description: 'Zadaj pytanie administracji',
                        value: 'question',
                        emoji: {
                            name: '❓',
                        },
                    },
                    {
                        label: 'Skarga na gracza',
                        description: 'Złóż skargę na gracza',
                        value: 'donos',
                        emoji: {
                            name: '🕵️',
                        },
                    },
                    {
                        label: 'Skarga na administratora',
                        description: 'Złóż skargę na członka administracji',
                        value: 'donosadm',
                        emoji: {
                            name: '🕵️',
                        },
                    },
                    {
                        label: 'Organizacja przestępcza',
                        description: 'Złóż podanie na organizację',
                        value: 'org',
                        emoji: {
                            name: '🔫',
                        },
                    },
                    {
                        label: 'Zakup se sklepu',
                        description: 'Wszystkie płatnosci oprócz PayPal',
                        value: 'buy',
                        emoji: {
                            name: '🤑',
                        },
                    },
                ]),
        );

        let embed = new MessageEmbed().setAuthor({name: 'Stwórz ticket'}).setColor('#74F625').setFooter({ text: 'SativaRP.eu', iconURL: client.user.displayAvatarURL()}).setTimestamp()
        message.channel.send({embeds: [embed], components: [row]})
    }
})


client.on('interactionCreate', (interaction) => {
    let tag; let member = interaction.member; let user = interaction.user; let guild = interaction.guild; let channel = interaction.channel;
    if(interaction.isButton()) {
        const customId = interaction.customId
        // let logs = client.channels.cache.get('886645197562327101')
        if(customId == 'vbutton') {
            if(member.roles.cache.has(roles.zweryfikowany)) return interaction.reply({ content: 'Jesteś już zweryfikowany!', ephemeral: true})
            member.roles.add(roles.zweryfikowany).then(() => {
                interaction.reply({content: 'Zostałeś zweryfikowany!', ephemeral: true})
                // logs.send(`**Użytkownik** <@${interaction.member.user.id}> **został zweryfikowany!\nID: **` + '``' + `${interaction.member.user.id}` + '``' + `\n**Nick Discord: **` + '``' + `${interaction.member.user.tag}` + '``')
            })
        } 
        if(customId == 'tbuttonclose') {
            channel.messages.fetch(channel.topic).then((message) => {
                const row = new MessageActionRow().addComponents([new MessageButton().setCustomId('tbuttondelete').setLabel('Skasuj ticket!').setStyle('DANGER')])
                message.edit({components: [row]})
                channel.edit({
                    permissionOverwrites: [{
                        id: channel.name.substring(7),
                        deny: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
                      },
                      {
                        id: guild.roles.everyone,
                        deny: ['VIEW_CHANNEL'],
                      }
                    ]
                  }).then(() => {
                    interaction.reply({content: 'Ticket został zamknięty!', ephemeral: false})
                  })
            })
        }
        if(customId == 'tbuttondelete') {
            interaction.reply({content: 'Ticket zostanie skasowany za 5 sekund!', ephemeral: false})
            setTimeout(() => {
                channel.delete()
            }, 5000)
        }
        return
    }
    if(interaction.isSelectMenu()) {
        if (interaction.customId === 'select') {
            let id;
            if(interaction.values[0] == 'changelog') id = roles.changelog
            if(interaction.values[0] == 'skrzynkiping') id = roles.skrzynkiping
            if(interaction.values[0] == 'eventy') id = roles.eventy
            if(interaction.values[0] == 'restarty') id = roles.restarty
            if(interaction.values[0] == 'member') id = roles.obywatel
            if(interaction.member.roles.cache.has(id)) return interaction.reply({ content: 'Posiadasz juz daną range!', ephemeral: true})
            interaction.member.roles.add(id).then(() => {
                interaction.reply({ content: 'Dodano range!', ephemeral: true})
            })
        }
        if(interaction.customId == 'ticket') {
            let ch =  guild.channels.cache.find(ch => ch.name === "ticket-" + user.id)
            if(ch) return interaction.reply({content: 'Posiadasz już otwarty ticket! <#' + ch.id + '>', ephemeral: true})
            let text;
            if(interaction.values[0] == 'question') text = 'Pytanie'
            if(interaction.values[0] == 'donos') text = 'Skarga na gracza'
            if(interaction.values[0] == 'donosadm') text = 'Skarga na administratora'
            if(interaction.values[0] == 'org') text = 'Organizacja przestępcza'
            if(interaction.values[0] == 'buy') text = 'Zakup ze sklepu'
            guild.channels.create(`ticket-${user.id}`, {
                parent: channels.ticketskategoria,
                topic: 'nigga',
                permissionOverwrites: [{
                    id: user.id,
                    allow: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
                  },
                  {
                    id: roles.administracja,
                    allow: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
                  },
                  {
                    id: guild.roles.everyone,
                    deny: ['VIEW_CHANNEL'],
                  },
                ],
                type: "GUILD_TEXT"
              }).then((c) => {
                interaction.reply({content: `Ticket stworzony! <#${c.id}>`,ephemeral: true});
                const embed = new MessageEmbed().setAuthor({name: user.tag, iconURL: user.displayAvatarURL()}).setDescription(`**${text}**\n\nPodaj informacje a administracja ci pomoże!`).setThumbnail(client.user.displayAvatarURL()).setFooter({ text: 'SativaRP.eu', iconURL: client.user.displayAvatarURL()}).setColor('#74F625').setTimestamp()
                const button = new MessageActionRow().addComponents(new MessageButton().setCustomId('tbuttonclose').setLabel('Zamknij ticket!').setStyle('DANGER'))
                c.send({content: `<@${user.id}>`, embeds: [embed], components: [button]}).then((msg) => {
                    c.setTopic(msg.id)
                })
            })
        }
        return
    }
    const name = interaction.commandName; const options = interaction.options._hoistedOptions
    if(name == 'siema') interaction.reply({content: 'siema :sunglasses:', ephemeral: false});
    if(name == 'ban') {
        let id = options[0].value
        if(!member.permissions.has(Permissions.FLAGS.BAN_MEMBERS)) return interaction.reply({content: 'Nie możesz wykonać tej komendy!', ephemeral: false})
        if(id.startsWith('<@') && id.endsWith('>')) {
            id = id.slice(2, -1);
            if (id.startsWith('!')) id = id.slice(1);
            let mentioned = interaction.guild.members.cache.get(id); if(mentioned == null) return interaction.reply({content: 'Nie znaleziono podanego użytkownika!', ephemeral: true})
            if(!mentioned.bannable) return interaction.reply({content: 'Nie moge zbanować tego użytkownika!', ephemeral: true})
            if(mentioned.roles.highest.position > member.roles.highest.position) return interaction.reply({content: 'Nie możesz zbanować tego użytkownika!', ephemeral: false})
            tag = mentioned.user.tag
            let reason = options[1].value
            mentioned.send('``Zostałeś zbanowany przez ' + member.user.tag + ', za: ' + reason + '``').catch(() => {})
            mentioned.ban({reason: reason}).then(() => {
                interaction.reply({content: '``Pomyślnie zbanowano ' + tag + ', za: ' + reason + '``', ephemeral: false})
            })
            return
        }
        let guy = interaction.guild.members.cache.get(options[0].value)
        if(guy == null) return interaction.reply({content: 'Podane ID jest nieprawidłowe!', ephemeral: true})
        if(!guy.bannable) return interaction.reply({content: 'Nie moge zbanować tego użytkownika!', ephemeral: true})
        if(guy.roles.highest.position > member.roles.highest.position) return interaction.reply({content: 'Nie możesz zbanować tego użytkownika!', ephemeral: false})
        tag = guy.user.tag
        let reason = options[1].value
        guy.send('``Zostałeś zbanowany przez ' + member.user.tag + ', za: ' + reason + '``').catch(() => {})
        guy.ban({reason: reason}).then(() => {
            interaction.reply({content: '``Pomyślnie zbanowano ' + tag + ', za: ' + reason + '``', ephemeral: false})
        })
    }
    if(name == 'nadajwl') {
        let id = options[0].value
        if(!member.roles.cache.has(roles.wlchecker)) return interaction.reply({content: 'Nie możesz wykonać tej komendy!', ephemeral: false})
        if(id.startsWith('<@') && id.endsWith('>')) {
            id = id.slice(2, -1);
            if (id.startsWith('!')) id = id.slice(1);
            let mentioned = interaction.guild.members.cache.get(id); if(mentioned == null) return interaction.reply({content: 'Nie znaleziono podanego użytkownika!', ephemeral: true})
            const embed = new MessageEmbed().setAuthor({name: 'Zostałeś przyjęty przez: ' + member.user.username, iconURL: member.user.displayAvatarURL({ dynamic: true})}).setThumbnail('https://cdn.discordapp.com/attachments/986677156367204445/987394487611441223/seal_2.png').setFooter({ text: 'SativaRP.eu', iconURL: client.user.displayAvatarURL()}).setColor("#4388fa").setDescription("**Pomyślnie zdałeś weryfikacje WL na serwerze SativaRP.eu oraz otrzymałeś rangę Obywatel!**\nOczekuj na dodanie cie do systemu Whitelist na serwerze!").setTitle('Gratulujemy!').setTimestamp()
            mentioned.roles.add('981925854265352273').then(() => {
                interaction.reply({content: '``Pomyślnie nadano whiteliste dla ' + mentioned.user.tag + '``', ephemeral: false})
                // let channel = client.channels.cache.get("886645197562327101"); channel.send('**Użytkownik** <@' + mentioned.id + '> **otrzymał rangę Obywatel!**\n**ID: ** ``' + mentioned.id + '``\n**Nick Discord: ** ``' + mentioned.user.tag + '``\n**Od: ** <@' + member.user.id + '>\n**ID: ** ``' + member.id + '``\n**Nick Discord: ** ``' + member.user.tag + '``')
                mentioned.send({content: '<@' + mentioned.id + '>', embeds: [embed]}).catch(() => {
                    interaction.reply({content: 'Użytkownik ma zablokowane wiadomości prywatne!, wiadomość nie została dostarczona', ephemeral: true})
                })
            })
            return
        }
        let guy = interaction.guild.members.cache.get(options[0].value)
        if(guy == null) return interaction.reply({content: 'Podane ID jest nieprawidłowe!', ephemeral: true})
        const embed = new MessageEmbed().setAuthor({name: 'Zostałeś przyjęty przez: ' + member.user.username, iconURL: member.user.displayAvatarURL({ dynamic: true})}).setThumbnail('https://cdn.discordapp.com/attachments/986677156367204445/987394487611441223/seal_2.png').setFooter({ text: 'SativaRP.eu', iconURL: client.user.displayAvatarURL()}).setColor("#4388fa").setDescription("**Pomyślnie zdałeś weryfikacje WL na serwerze SativaRP.eu oraz otrzymałeś rangę Obywatel!**\nOczekuj na dodanie cie do systemu Whitelist na serwerze!").setTitle('Gratulujemy!').setTimestamp()
        guy.roles.add(roles.obywatel).then(() => {
            interaction.reply({content: '``Pomyślnie nadano whiteliste dla ' + guy.user.tag + '``', ephemeral: false})
            // let channel = client.channels.cache.get("886645197562327101"); channel.send('**Użytkownik** <@' + guy.id + '> **otrzymał rangę Obywatel!**\n**ID: ** ``' + guy.id + '``\n**Nick Discord: ** ``' + guy.user.tag + '``\n**Od: ** <@' + member.user.id + '>\n**ID: ** ``' + member.id + '``\n**Nick Discord: ** ``' + member.user.tag + '``')
            guy.send({content: '<@' + guy.id + '>', embeds: [embed]}).catch(() => {
                interaction.reply({content: 'Użytkownik ma zablokowane wiadomości prywatne!, wiadomość nie została dostarczona', ephemeral: true})
            })
        })
    }
    if(name == 'przerwa') {
        if(!member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return interaction.reply({content: 'Nie możesz wykonać tej komendy!', ephemeral: false})
        let guy = interaction.guild.members.cache.get(options[0].value)
        if(guy == null) return interaction.reply({content: 'Podane ID jest nieprawidłowe!', ephemeral: true})
        if(!guy.moderatable) return interaction.reply({content: 'Nie moge nałożyć przerwy na tego użytkownika!', ephemeral: true})
        if(guy.roles.highest.position > member.roles.highest.position) return interaction.reply({content: 'Nie możesz nałożyć przerwy tego użytkownika!', ephemeral: false})
        if(guy.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return interaction.reply({content: 'Nie możesz nałożyć przerwy tego użytkownika!', ephemeral: false})
        tag = guy.user.tag
        let reason = options[1].value
        let time = options[2].value; log(typeof time); if(typeof parseInt(time) != 'number') return interaction.reply({ content: 'Podany czas jest nieprawidłowy!', ephemeral: true})
        guy.timeout(time * 60 * 1000).then(() => {
            interaction.reply({content: '``Pomyślnie nałożono przerwę(' + time + 'min) na ' + tag + ', za: ' + reason + '``', ephemeral: false})
        }).catch((err) => {
            log(err)
        })
    }
    if(name == 'losujwl') {
        if(!member.roles.cache.has(roles.wlchecker)) return interaction.reply({content: 'Nie możesz wykonać tej komendy!', ephemeral: false})
        if(!member.voice) return interaction.reply({content: 'Nie znajdujesz sie na kanale!', ephemeral: true})
        let channel = guild.channels.cache.get(channels.poczekalniawl)
        let typek = channel.members.random()
        if(!typek) return interaction.reply({content: 'Poczekalnia jest pusta!', ephemeral: false})
        let gm = guild.members.cache.get(typek.id)
        let ch = guild.channels.cache.get(member.voice.channelId)
        interaction.reply({content: `Wylosowana osoba: ${typek}`, ephemeral: false})
        gm.voice.setChannel(ch).catch((err) => {
            if(err) throw err;
        }).then((mbm) => {
            // log(mbm)
        })
    }
    if(name == 'changelog') {
        if(!member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return interaction.reply({content: 'Nie możesz wykonać tej komendy!', ephemeral: false})
        let content = options[0].value
        let embed = new MessageEmbed().setAuthor({name: 'Changelog'}).setColor('#74F625').setDescription('```'+content+'```').setFooter({ text: member.user.tag, iconURL: member.displayAvatarURL({ dynamic: true})}).setThumbnail(client.user.displayAvatarURL()).setTimestamp()
        let channel = client.channels.cache.get(channels.changelog)
        channel.send({ content: '<@&1082812102726660222>', embeds: [embed]}).then(() => {
            interaction.reply({content: 'Changelog został wypisany!', ephemeral: false})
        })
    }
    if(name == 'clear') {
        if(!member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) return interaction.reply({content: 'Nie możesz wykonać tej komendy!', ephemeral: false})
        let size = options[0].value; if(size > 100) return interaction.reply({content: 'Liczba nie może być większa niż 100!', ephemeral: true})
        interaction.channel.bulkDelete(size).then(() => {
            interaction.reply({content: 'Wyczyszczono kanał!', ephemeral: true})
        })
    }
})

client.login(token).catch(() => {
    throw log('token is invalid [' + token + ']')
})