const TeleBot = require('telebot');
const fs = require('fs');
const STATE = {
    Idle: 1,
    Betting: 2,
    Spinning: 3,
}

class Bot {
    constructor() {
        this.bot = null;
        this.state = {
            currentState: STATE.Idle,
            log: [],
            users: {},
        };

        this.api = {
            send: (text, chatId) => {
                this.bot.sendMessage(chatId, text)
                    .then(x => setTimeout(() => this.bot.deleteMessage(chatId, x.message_id), 60000));
                },
            gif: (name, timeout, chatId) => {
                this.bot.sendAnimation(chatId, `${name}.mp4`)
                    .then(x => setTimeout(() => this.bot.deleteMessage(chatId, x.message_id), timeout));
            },
            save: () => this.saveState(),
            getUser: (id, chatId) => this.bot.getChatMember(chatId, id)
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
                this.state.log = loadedData.log || [];
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
            console.log(`Recieved message: ${msg.text}`);
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

        if (!this.state.users[msg.from.id])
            this.state.users[msg.from.id] = 300;

        let points = msg.text.length > 25 ? 25 : msg.text.length;
        this.state.users[msg.from.id] += points;

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