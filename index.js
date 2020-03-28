let CommandBuilder = require("./commandBuilder");
let Roullete = require("./roullete");

let bot = require("./bot");
let roulette = new Roullete();
const STATE = {
    Idle: 1,
    Betting: 2,
    Spinning: 3,
}


let balanceCommand = new CommandBuilder()
    .on("баланс")
    .do((state, api, msg) => {
        api.send(state.users[msg.from.id]);
    })
    .build();

let logCommand = new CommandBuilder()
    .on("лог")
    .do((state, api, msg) => {
        let reply = "Лог:\n";
        state.log.forEach(e => {
            reply += `${e} ${e == 0 ? '💚' : (e % 2 ? '🔴' : '⚫️')}\n`;
        })
        api.send(reply);
    })
    .build();

let plusCommand = new CommandBuilder()
    .on(/\+(?<p>\d*).*/gm)
    .when((state, msg) => !!msg.reply_to_message)
    .do((state, api, msg, result) => {
        var amount = 1;
        amount = parseInt(result.groups.p) || amount;
        if (state.users[msg.from.id] >= amount) {
            state.users[msg.from.id] -= amount;
            state.users[msg.reply_to_message.from.id] += amount;
            api.send(`${msg.from.first_name} перевел ${msg.reply_to_message.from.first_name} ${amount} монет`);
        }
    })
    .build();

let roulleteCommand = new CommandBuilder()
    .on("рулетка")
    .when((state, msg) => state.currentState == STATE.Idle)
    .do((state, api, msg, result) => {
        api.send("Минирулетка\n\
Угадайте число из: \n\
0💚 \n\
1🔴 2⚫️ 3🔴 4⚫️ 5🔴 6⚫️\n\
7🔴 8⚫️ 9🔴10⚫️11🔴12⚫️");
        state.currentState = STATE.Betting;
    })
    .build();

let goCommand = new CommandBuilder()
    .on("го")
    .when((state, msg) => state.currentState == STATE.Betting)
    .do((state, api, msg, result) => {
        state.currentState = STATE.Spinning;
        api.send("Крутим...");
        api.gif("roulette", 5000);
        setTimeout(() => {
            roulette.roll(state, api);
            state.currentState = STATE.Idle;
        }, 5500)
    })
    .build();

let betCommand = new CommandBuilder()
    .on(/(?<bet>\d+) (?<on>\S+)/gm)
    .when((state, msg) => state.currentState == STATE.Betting)
    .do((state, api, msg, result) => {
        let valueToBet = parseInt(result.groups.bet);
        let betOn = result.groups.on;

        if (valueToBet && valueToBet > 0 && roulette.availibleBets.indexOf(betOn) > -1) {
            if (state.users[msg.from.id] * 0.75 < valueToBet) {
                api.send(`Ставка не может превышать 75% от твоих средств. Баланс ${state.users[msg.from.id]}, ставка ${valueToBet}`);
            }
            else {
                roulette.bet(betOn, valueToBet, msg.from.id, msg.from.first_name);
                state.users[msg.from.id] -= valueToBet;

                let onMarker = betOn;
                if (betOn == 'к')
                    onMarker = '🔴';
                if (betOn == 'ч')
                    onMarker = '⚫️';
                if (betOn == '0')
                    onMarker = '💚';

                api.send(`Ставка принята: ${msg.from.first_name} ${valueToBet} на ${onMarker}`);
            }
        }
    })
    .build();

let commands = [balanceCommand, logCommand, plusCommand, roulleteCommand, betCommand, goCommand];
commands.forEach(cmd => bot.addCommand(cmd));