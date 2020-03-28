const TeleBot = require('telebot');
const fs = require('fs');
const STATE = {
    Idle: 1,
    Betting: 2,
    Spinning: 3,
}

class Bot{
    constructor() {
        this.bot = null;
        this.state = {
            currentState : STATE.Idle,
            log: [],
            users: {},
        };
        
        this.commands = [];
    
        this.loadState();
    }

    saveState(callback){
        callback = callback || (() => {});
        fs.writeFile('save.json', JSON.stringify({
            users: this.state.users,
            log: this.state.log
        }), 'utf8', callback);
    }

    loadState(){
        fs.readFile('save.json', 'utf8', (err, data) => {
            if (err){
                console.error(err);
            } else {
            let loadedData = JSON.parse(data);
            this.state.users = loadedData.users || {}; 
            this.state.log = loadedData.log || []; 
        }});
    }

    addCommand(command){
        this.commands.push(command);
    }

    start(token){
        this.bot = new TeleBot({
            token: token,
            polling:{
                interval: 50,
            }
        });
        this.bot.on('text', (msg) => {
            console.log(`Recieved message: ${msg.text}`);

            if (!this.state.users[msg.from.id])
                this.state.users[msg.from.id] = 300;
    
            let points = msg.text.length > 25 ? 25 : msg.text.length;
            this.state.users[msg.from.id] += points;

            let api = {
                send: (text) => msg.reply.text(text),
                gif: (name, timeout) => {
                    this.bot.sendAnimation(msg.chat.id, `${name}.mp4`)
                        .then(x => setTimeout(() => this.bot.deleteMessage(msg.chat.id, x.message_id), timeout));
                },
                save: () => this.saveState(),
                getUser: (id) => this.bot.getChatMember(msg.chat.id, id)
            };

            if (msg.chat){
                api.send = (text) => {
                    this.bot.sendMessage(msg.chat.id, text)
                        .then(x => setTimeout(() => this.bot.deleteMessage(msg.chat.id, x.message_id), 60000));
                }
            }

            this.commands.forEach(cmd => {
                cmd.exec(msg.text, this.state, api, msg);
            });

            this.saveState();
        });

        this.bot.start();
    }
}

let bot = new Bot();
fs.readFile('token', 'utf8', (err, data) => {
    if (err){
        console.error(err);
    } else {
        bot.start(data);
}});

module.exports = bot;