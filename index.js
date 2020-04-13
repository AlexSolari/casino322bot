var allSettled = require('promise.allsettled');

let CommandBuilder = require("./services/commandBuilder");
let Roullete = require("./games/roullete");
let Bandit = require("./games/bandit");
let Auction = require("./games/auction");
let Dice = require("./games/dice");

let games = require("./services/gamestore");
let promos = require("./services/promoService");
let bot = require("./entities/bot");
const STATE = require("./helpers/roulleteState");

let generalCommands = (() => {
    let creditCommand = new CommandBuilder("General.Credit")
        .on(/кредит (?<bet>\d+)/i)
        .do((state, api, msg, result) => {
            let valueToBet = parseInt(result.groups.bet);

            if (valueToBet) {
                let maxCredit = Math.floor(Math.max(1000, 1000 + state.users[msg.from.id]*0.15));

                if (valueToBet < 0 || valueToBet > maxCredit) {
                    api.send(`💰 ${msg.from.first_name}, сумма кредита может быть от 1 до ${maxCredit}.`, msg.chat.id);
                }
                else {
                    if (state.activeCredits.indexOf(msg.from.id) != -1){
                        api.send(`💰 ${msg.from.first_name}, прежде чем брать новый кредит, отдай старый.`, msg.chat.id);
                    }
                    else if (state.users[msg.from.id] <= -500){
                        api.send(`💰 ${msg.from.first_name}, нельзя брать кредит имея более 500 монет долга.`, msg.chat.id);
                    }
                    else{
                        state.activeCredits.push(msg.from.id);
                        state.users[msg.from.id] += valueToBet;
                        api.send(`💰 ${msg.from.first_name}, взял кредит в ${valueToBet} монет. Спустя минуту с тебя снимут сумму с процентами (5%).`, msg.chat.id);
                        
                        setTimeout(() => {
                            state.users[msg.from.id] -= Math.ceil(valueToBet * 1.05);
                            state.activeCredits = state.activeCredits.filter(x => x != msg.from.id);
                            api.send(`💰 С ${msg.from.first_name} снято ${Math.ceil(valueToBet * 1.05)} монет.`, msg.chat.id);
                            api.save();
                        }, 60000);
                    }
                }
            }
        })
        .build();

    let statusCommand = new CommandBuilder("General.Status")
        .on("статус")
        .do((state, api, msg) => {
            let status = api.getUserStatus(msg.from.id);
            let m = `🏦 Инфо про юзера ${msg.from.first_name}\n`;
            m += `Баланс: ${status.balance}\n`;
            m += `Есть активный кредит: ${(status.hasActiveCredits) ? "Да" : "Нет"}\n`;
            m += `Наказание за спам: ${(status.isRestricted) ? "Да" : "Нет"}\n`;
            api.send(m, msg.chat.id);
        })
        .build();

    let balanceCommand = new CommandBuilder("General.Balance")
        .on("баланс")
        .do((state, api, msg) => {
            api.send(`🏦 ${state.users[msg.from.id]}`, msg.chat.id);
        })
        .build();

    let plusCommand = new CommandBuilder("General.Plus")
        .on(/^\+(?<p>\d*).*/gim)
        .when((state, msg) => !!msg.reply_to_message)
        .do((state, api, msg, result) => {
            var amount = 1;
            amount = parseInt(result.groups.p) || amount;
            if (state.users[msg.from.id] >= amount) {
                state.users[msg.from.id] -= amount;
                state.users[msg.reply_to_message.from.id] += amount;
                api.send(`💸 ${msg.from.first_name} перевел ${msg.reply_to_message.from.first_name} ${amount} монет`, msg.chat.id);
            }
        })
        .build();

    let topCommand = new CommandBuilder("General.Top")
        .on("топ")
        .do((state, api, msg, result) => {
            let keys = Object.keys(state.users);
            let promises = [];
            let users = keys.map(x => {
                promises.push(api.getUser(x, msg.chat.id));
            })
            allSettled(promises).then(res => {
                let mapped = res.filter(u => u.status == "fulfilled").filter(u => u.value.status != "left").map(u => u.value.user).map(u => {
                    return { user: u, points: state.users[u.id] }
                }).sort((x, y) => y.points - x.points).slice(0, 5);

                let topmsg = "💰 Топ чата 💰\n\n";
                mapped.forEach(u => {
                    topmsg += `${mapped.indexOf(u) + 1}) ${u.user.first_name} - ${u.points}\n`;
                })
                api.send(topmsg, msg.chat.id);
            });
        })
        .build();

    let listCommand = new CommandBuilder("General.List")
        .on("весьсписок")
        .do((state, api, msg, result) => {
            let keys = Object.keys(state.users);
            let promises = [];
            let users = keys.map(x => {
                promises.push(api.getUser(x, msg.chat.id));
            })
            allSettled(promises).then(res => {
                let mapped = res.filter(u => u.status == "fulfilled").map(u => u.value.user).map(u => {
                    return { user: u, points: state.users[u.id] }
                }).sort((x, y) => y.points - x.points);

                let topmsg = "💰 Список 💰\n\n";
                mapped.forEach(u => {
                    topmsg += `${mapped.indexOf(u) + 1}) ${u.user.first_name} - ${u.points}\n`;
                })
                api.send(topmsg, msg.chat.id);
            });
        })
        .build();

    let bottomCommand = new CommandBuilder("General.Bottom")
        .on("боттом")
        .do((state, api, msg, result) => {
            let keys = Object.keys(state.users);
            let promises = [];
            let users = keys.map(x => {
                promises.push(api.getUser(x, msg.chat.id));
            })
            allSettled(promises).then(res => {
                let mapped = res.filter(u => u.status == "fulfilled").filter(u => u.value.status != "left").map(u => u.value.user).map(u => {
                    return { user: u, points: state.users[u.id] }
                }).filter(x => x.points).sort((x, y) => x.points - y.points).slice(0, 5);

                let topmsg = "🗑️ Боттом чата 🗑️\n\n";
                mapped.forEach(u => {
                    topmsg += `${mapped.indexOf(u) + 1}) ${u.user.first_name} - ${u.points}\n`;
                })
                api.send(topmsg, msg.chat.id);
            });
        })
        .build();

    let helpCommand = new CommandBuilder("General.Help")
        .on(["/help@chz_casino_bot", "/help"])
        .do((state, api, msg, result) => {
            let message = "❓ *Актуальные команды бота* ❓\n";
            message += " - *баланс* _(показывает ваш актуальный баланс)_\n";
            message += " - *топ*  _(топ чата по балансу на текущий момент)_\n";
            message += " - *рулетка [ставка]* _(числа от 0 до 12, выбери правильный цвет или число и получи приз)_\n";
            message += " - *бандит [ставка]* _(классика игровых слотов)_\n";
            message += " - *аукцион [ставка]* _(ставки от всех желающих, владелец самой высокой ставки забирает весь банк себе)_\n";
            message += " - *куб [ставка] [сторона кубика]* _(числа от 1 до 6)_\n";
            message += " - *промо [код]* _(активация промокода)_\n";
            message += " - *кредит [сумма]* _(отдолжить у бота деняк)_\n";
            message += " - *статус* _(информация про аккаунт)_\n";
            api.send(message, msg.chat.id);
        }).build();

    let promoCommand = new CommandBuilder("General.Promo")
        .on(/промо (?<code>.+)/i)
        .do((state, api, msg, result) => {
            let code = result.groups.code;

            promos.checkCode(code, (matchedCodes) => {
                matchedCodes.forEach(c => {
                    state.users[msg.from.id] += c.award;
                    api.send(`🏆 Промокод '${c.code}' активирован. Добавлено ${c.award} монет.`, msg.chat.id);
                });
            })
        })
        .build();

    return [balanceCommand,
        creditCommand,
        plusCommand,
        topCommand,
        bottomCommand,
        helpCommand,
        promoCommand,
        listCommand,
        statusCommand];
})();

let roulleteCommands = (() => {

    let autostartCommand = new CommandBuilder("Roullete.AutostartToggle")
        .on("рулетка автостарт")
        .do((state, api, msg) => {
            let game = games.get("roullete", msg.chat.id);
            
            game.autoStart = !game.autoStart;
            let newStatus = (game.autoStart) ? "включен" : "выключен";
            api.send(`Автостарт рулетки ${newStatus}`, msg.chat.id);
        })
        .build();

    let logCommand = new CommandBuilder("Roullete.Log")
        .on("лог")
        .do((state, api, msg) => {
            let game = games.get("roullete", msg.chat.id);
            game.showLog(state, api, msg.chat.id);
        })
        .build();


    let roulleteCommand = new CommandBuilder("Roullete.Start")
        .on("рулетка")
        .do((state, api, msg, result) => {
            let game = games.get("roullete", msg.chat.id);
            game.start(api, msg.chat.id);
        })
        .build();

    let betsCommand = new CommandBuilder("Roullete.BetsInfo")
        .on("ставки")
        .do((state, api, msg, result) => {
            let game = games.get("roullete", msg.chat.id);
            game.showBets(api, msg.chat.id);
        })
        .build();

    let goCommand = new CommandBuilder("Roullete.Spin")
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
            api.sendRollingMessage(msg.chat.id);

            setTimeout(() => {
                game.roll(state, api, msg.chat.id);
                setTimeout(() => {
                    game.start(api, msg.chat.id);
                }, 1000);
            }, 6500)
        })
        .build();

    let betCommand = new CommandBuilder("Roullete.Bet")
        .on(/^(?<bet>\d+) (?<on>\S+)/i)
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
                    game.bet(betOn, valueToBet, msg.from.id, msg.from.first_name, state);

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

    return [logCommand,
        roulleteCommand,
        betCommand,
        goCommand,autostartCommand,betsCommand];
})();

let banditCommands = (() => {
    let banditCommand = new CommandBuilder("Bandit.Roll")
        .on(/бандит (?<bet>\d+)/i)
        .do((state, api, msg, result) => {
            let valueToBet = parseInt(result.groups.bet);
            let game = games.get("bandit", msg.chat.id);

            if (valueToBet && valueToBet > 0) {
                if (state.users[msg.from.id] < valueToBet) {
                    api.send(`🎲 Ставка не может превышать 100% от твоих средств. Баланс ${state.users[msg.from.id]}, ставка ${valueToBet}`, msg.chat.id);
                }
                else {
                    state.users[msg.from.id] -= valueToBet;
                    game.roll(valueToBet, msg.from.id, msg.from.first_name, state, api, msg.chat.id);
                }
            }
        })
        .build();

    return [banditCommand];
})();

let auctionCommands = (() => {
    let auctionCommand = new CommandBuilder("Auction.Bet")
        .on(/аукцион (?<bet>\d+)/i)
        .do((state, api, msg, result) => {
            let valueToBet = parseInt(result.groups.bet);
            let game = games.get("auction", msg.chat.id);

            if (valueToBet && valueToBet > 0) {
                if (game.inProgress) {
                    game.bet(valueToBet, msg.from.id, msg.from.first_name, state, api, msg.chat.id);
                }
                else {
                    game.start(valueToBet, msg.from.id, msg.from.first_name, state, api, msg.chat.id);
                }
            }
        })
        .build();

    return [auctionCommand];
})();

let diceCommands = (() => {
    let diceCommand = new CommandBuilder("Dice.Roll")
        .on(/^куб (?<bet>\d+) (?<on>\d)/i)
        .do((state, api, msg, result) => {
            let valueToBet = parseInt(result.groups.bet);
            let betOn = parseInt(result.groups.on);
            let game = games.get("dice", msg.chat.id);

            if (valueToBet && valueToBet > 0 && [1, 2, 3, 4, 5, 6].indexOf(betOn) != -1) {
                if (state.users[msg.from.id] < valueToBet) {
                    api.send(`🎲 Ставка не может превышать 100% от твоих средств. Баланс ${state.users[msg.from.id]}, ставка ${valueToBet}`, msg.chat.id);
                }
                else {
                    game.roll(valueToBet, betOn, msg.from.id, msg.from.first_name, state, api, msg.chat.id);
                }
            }
        })
        .build();


    let diceLogCommand = new CommandBuilder("Dice.Log")
        .on("куб лог")
        .do((state, api, msg, result) => {
            let game = games.get("dice", msg.chat.id);

            game.showLog(api, msg.chat.id);
        })
        .build();

    return [diceCommand, diceLogCommand];
})();

let commands = [
    ...generalCommands,
    ...roulleteCommands,
    ...banditCommands,
    ...auctionCommands,
    ...diceCommands
];

commands.forEach(cmd => bot.addCommand(cmd));

games.addGame("roullete", () => new Roullete());
games.addGame("auction", () => new Auction());
games.addGame("bandit", () => new Bandit());
games.addGame("dice", () => new Dice());
