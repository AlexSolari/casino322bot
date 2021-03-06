const TeleBot = require('telebot');
const fs = require('fs');
let BotApiHelper = require("../helpers/botApi");

class Bot {
    constructor() {
        this.bot = null;
        this.state = {
            log: {},
            users: {},
            bonuses: {},
        };

        this.restrictedUsers = [];
        this.recentMessages = {};

        this.api = null;

        this.commands = [];
        this.commandQueue = [];

        this.loadState();
    }

    saveState(callback) {
        callback = callback || (() => { });
        fs.writeFile('save.json', JSON.stringify({
            users: this.state.users,
            log: this.state.log,
            bonuses: this.state.bonuses,
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
                this.state.bonuses = loadedData.bonuses || {};
            }
        });
    }

    addCommand(command) {
        this.commands.push(command);
    }

    start(token) {
        const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

        this.bot = new TeleBot({
            token: token,
            polling: {
                interval: 50,
                limit: 10,
            }
        });
        this.api = new BotApiHelper(this);
        this.bot.on('text', (msg) => {
            console.log(`${msg.chat.title || "DM"} | ${msg.from.first_name} (${msg.from.id}): ${msg.text}`);
            this.commandQueue.push(msg);
        });

        this.bot.start();

        setInterval(async () => {
            while (this.commandQueue.length > 0) {
                let queuedMsg = this.commandQueue.shift();
                this.dequeue(queuedMsg);
                await sleep(50);
            }
        }, 500);
    }

    dequeue(msg) {
        let recentMessagesFromUser = this.recentMessages[msg.chat.id];

        if (!recentMessagesFromUser)
            recentMessagesFromUser = this.recentMessages[msg.chat.id] = [];

        if (this.state.users[msg.from.id] == undefined)
            this.state.users[msg.from.id] = 3000;

        if (recentMessagesFromUser.length > 50)
        recentMessagesFromUser.shift();

        if (recentMessagesFromUser.indexOf(msg.text) == -1){
            let points = msg.text.length > 10 ? 10 : msg.text.length;
            this.state.users[msg.from.id] += (this.restrictedUsers.indexOf(msg.from.id) == -1) 
                ? points 
                : 1;
        }

        recentMessagesFromUser.push(msg.text);

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