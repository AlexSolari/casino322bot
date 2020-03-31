const TeleBot = require('telebot');
const fs = require('fs');

class Bot {
    constructor() {
        this.bot = null;
        this.state = {
            log: {},
            users: {},
        };

        this.restrictedUsers = [];
        this.recentMessages = {};

        this.api = {
            sendRollingMessage: (chatId) => {
                let gN = (min, max) => {
                    min = 0;
                    max = 12;
                    let number = Math.floor(Math.random() * (max - min + 1)) + min;
                    let onMarker = '';
                    if (number % 2 == 0)
                        onMarker = '🔴';
                    if (number % 2 == 1)
                        onMarker = '⚫️';
                    if (number == 0)
                        onMarker = '💚';
                    return `${number}${onMarker}`;
                }

                this.bot.sendMessage(chatId, gN())
                    .then(x => {
                        setTimeout(() => this.bot.editMessageText({chatId, messageId:x.message_id},gN()), 1000);
                        setTimeout(() => this.bot.editMessageText({chatId, messageId:x.message_id},gN()), 2000);
                        setTimeout(() => this.bot.editMessageText({chatId, messageId:x.message_id},gN()), 3000);
                        setTimeout(() => this.bot.editMessageText({chatId, messageId:x.message_id},gN()), 4000);
                        setTimeout(() => this.bot.editMessageText({chatId, messageId:x.message_id},gN()), 5000);
                        setTimeout(() => this.bot.deleteMessage(chatId, x.message_id), 6000);
                    });
                
                },
            send: (text, chatId) => {
                this.bot.sendMessage(chatId, text, {parseMode: "Markdown"})
                    .then(x => setTimeout(() => this.bot.deleteMessage(chatId, x.message_id), 60000));
                },
            gif: (name, timeout, chatId) => {
                let path = `./content/${name}.mp4`;
                this.bot.sendAnimation(chatId, path)
                    .then(x => setTimeout(() => this.bot.deleteMessage(chatId, x.message_id), timeout));
            },
            save: () => this.saveState(),
            getUser: (id, chatId) => this.bot.getChatMember(chatId, id),
            forward: (chatId, fromChatId, msgId) => this.bot.forwardMessage(chatId, fromChatId, msgId)
                .then(x => setTimeout(() => this.bot.deleteMessage(chatId, x.message_id), 60000))
        };

        this.commands = [];
        this.commandQueue = [];

        this.loadState();
    }

    saveState(callback) {
        callback = callback || (() => { });
        fs.writeFile('save.json', JSON.stringify({
            users: this.state.users,
            log: this.state.log
        }), 'utf8', callback);
    }

    loadState() {
        fs.readFile('save.json', 'utf8', (err, data) => {
            if (err) {
                console.error(err);
            } else {
                let loadedData = JSON.parse(data);
                this.state.users = loadedData.users || {};
                this.state.log = loadedData.log || {};
            }
        });
    }

    addCommand(command) {
        this.commands.push(command);
    }

    start(token) {
        this.bot = new TeleBot({
            token: token,
            polling: {
                interval: 50,
            }
        });
        this.bot.on('text', (msg) => {
            console.log(`${msg.chat.id} | Recieved message: ${msg.text}`);
            this.commandQueue.push(msg);
        });

        this.bot.start();

        setInterval(() => {
            while (this.commandQueue.length > 0) {
                let queuedMsg = this.commandQueue.shift();
                this.dequeue(queuedMsg);
            }
        }, 333);
    }

    dequeue(msg) {
        if (!msg.chat) {
            this.api.send("Работаем только в конфах, соре", msg.chat.id);
            return;
        }

        if (!this.recentMessages[msg.chat.id])
            this.recentMessages[msg.chat.id] = [];

        if (this.state.users[msg.from.id] == undefined)
            this.state.users[msg.from.id] = 300;

        if (this.recentMessages[msg.chat.id].length > 50)
            this.recentMessages[msg.chat.id].shift();

        if (this.recentMessages[msg.chat.id].indexOf(msg.text) == -1){
            let points = msg.text.length > 25 ? 25 : msg.text.length;
            this.state.users[msg.from.id] += (this.restrictedUsers.indexOf(msg.from.id) == -1) ? points : 1;
        }

        this.recentMessages[msg.chat.id].push(msg.text);

        this.commands.forEach(cmd => {
            cmd.exec(msg.text, this.state, this.api, msg);
        });

        this.saveState();
    }
}

let bot = new Bot();
fs.readFile('token', 'utf8', (err, data) => {
    if (err) {
        console.error(err);
    } else {
        bot.start(data);
    }
});

module.exports = bot;