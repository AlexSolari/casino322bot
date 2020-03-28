let CommandBuilder = require("./services/commandBuilder");
let Roullete = require("./games/roullete");

let games = require("./services/gamestore");
let bot = require("./entities/bot");
const STATE = {
    Idle: 1,
    Betting: 2,
    Spinning: 3,
}


let balanceCommand = new CommandBuilder("Balance")
    .on("баланс")
    .do((state, api, msg) => {
        api.send(state.users[msg.from.id], msg.chat.id);
    })
    .build();

let logCommand = new CommandBuilder("Log")
    .on("лог")
    .do((state, api, msg) => {
        let reply = "Лог:\n";
        (state.log[msg.chat.id] || []).forEach(e => {
            reply += `${e} ${e == 0 ? '💚' : (e % 2 ? '🔴' : '⚫️')}\n`;
        })
        api.send(reply, msg.chat.id);
    })
    .build();

let plusCommand = new CommandBuilder("Plus")
    .on(/^\+(?<p>\d*).*/gim)
    .when((state, msg) => !!msg.reply_to_message)
    .do((state, api, msg, result) => {
        var amount = 1;
        amount = parseInt(result.groups.p) || amount;
        if (state.users[msg.from.id] >= amount) {
            state.users[msg.from.id] -= amount;
            state.users[msg.reply_to_message.from.id] += amount;
            api.send(`${msg.from.first_name} перевел ${msg.reply_to_message.from.first_name} ${amount} монет`, msg.chat.id);
        }
    })
    .build();

let roulleteCommand = new CommandBuilder("Roullete")
    .on("рулетка")
    .do((state, api, msg, result) => {
        let game = games.get("roullete", msg.chat.id);
        if (game.state == STATE.Idle){
            api.send("🎲 Минирулетка\n\
Угадайте число из: \n\
0💚 \n\
1🔴 2⚫️ 3🔴 4⚫️ 5🔴 6⚫️\n\
7🔴 8⚫️ 9🔴10⚫️11🔴12⚫️", msg.chat.id);
            game.state = STATE.Betting;
        }
        else{
            api.send("🎲 Рулетка уже запущена, делайте ставки", msg.chat.id);
        }
    })
    .build();

let goCommand = new CommandBuilder("Spin")
    .on("го")
    .when((state, msg) => {
        let game = games.get("roullete", msg.chat.id);

        return game.state == STATE.Betting;
    })
    .do((state, api, msg, result) => {
        
        let game = games.get("roullete", msg.chat.id);
        let gifToShow = Math.random() > 0.1 ? "roulette" : "rare_spin";

        game.state = STATE.Spinning;
        api.send("🎲 Крутим...", msg.chat.id);
        api.gif(gifToShow, 5000, msg.chat.id);

        setTimeout(() => {
            game.roll(state, api, msg.chat.id);
        }, 5500)
    })
    .build();

let betCommand = new CommandBuilder("Bet")
    .on(/(?<bet>\d+) (?<on>\S+)/i)
    .when((state, msg) => {
        let game = games.get("roullete", msg.chat.id);

        return game.state == STATE.Betting;
    })
    .do((state, api, msg, result) => {
        let valueToBet = parseInt(result.groups.bet);
        let betOn = result.groups.on;
        let game = games.get("roullete", msg.chat.id);

        if (valueToBet && valueToBet > 0 && game.availibleBets.indexOf(betOn) > -1) {
            if (state.users[msg.from.id] < valueToBet) {
                api.send(`🎲 Ставка не может превышать 100% от твоих средств. Баланс ${state.users[msg.from.id]}, ставка ${valueToBet}`, msg.chat.id);
            }
            else {
                game.bet(betOn, valueToBet, msg.from.id, msg.from.first_name);
                state.users[msg.from.id] -= valueToBet;

                let onMarker = betOn;
                if (betOn == 'к')
                    onMarker = '🔴';
                if (betOn == 'ч')
                    onMarker = '⚫️';
                if (betOn == '0')
                    onMarker = '💚';

                api.send(`🎲 Ставка принята: ${msg.from.first_name} ${valueToBet} на ${onMarker}`, msg.chat.id);
            }
        }
    })
    .build();

let topCommand = new CommandBuilder("Top")
    .on("топ")
    .do((state, api, msg, result) => {
        let keys = Object.keys(state.users);
        let promises = [];
        let users = keys.map(x => {
            promises.push(api.getUser(x, msg.chat.id));
        })
        Promise.all(promises).then(res => {
            let mapped = res.map(u => u.user).map(u => { 
                return { user: u, points: state.users[u.id] } 
            }).sort((x, y) => y.points - x.points).slice(0, 5);

            let topmsg = "💰Топ чата💰\n\n";
            mapped.forEach(u => {
                topmsg += `${mapped.indexOf(u) + 1}) ${u.user.first_name} - ${u.points}\n`;
            })
            api.send(topmsg, msg.chat.id);
        });
    })
    .build();

let commands = [balanceCommand, logCommand, plusCommand, roulleteCommand, betCommand, goCommand, topCommand];
commands.forEach(cmd => bot.addCommand(cmd));
games.addGame("roullete", () => new Roullete());