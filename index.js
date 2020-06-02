var allSettled = require('promise.allsettled');

let CommandBuilder = require("./services/commandBuilder");
let Roullete = require("./games/roullete");
let Bandit = require("./games/bandit");
let Auction = require("./games/auction");
let Dice = require("./games/dice");
let BonusModel = require("./helpers/bonusModel");

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
        .disabled()
        .build();

    let statusCommand = new CommandBuilder("General.Status")
        .on("статус")
        .do((state, api, msg) => {
            let status = api.getUserStatus(msg.from.id);

            let rewardBase = 1000;
            let coeff = Math.pow(1.1, status.bonus.streak);
            let nextBonus = Math.floor(rewardBase * (coeff));
            let oneDay = 1 * 20 * 60 * 60 * 1000; //20 hours to make exp. more smooth
            let dayAgo = Date.now() - oneDay;
            let canClaim = (new Date(new Date(status.bonus.lastClaimed).getTime() + oneDay) <= Date.now());

            let m = `🏦 Инфо про юзера ${msg.from.first_name}\n`;
            m += `Баланс: ${status.balance}\n`;
            m += `Следующий бонус: ${nextBonus}\n`;
            m += canClaim 
                ? `Бонус можно забрать.\n`
                : `Бонус можно забрать через ${Math.ceil(Math.abs(new Date(status.bonus.lastClaimed) - dayAgo) / 36e5)} часов.\n`
            api.send(m, msg.chat.id);
        })
        .build();

    let balanceCommand = new CommandBuilder("General.Balance")
        .on("баланс")
        .do((state, api, msg) => {
            api.send(`🏦 ${state.users[msg.from.id]}`, msg.chat.id);
        })
        .build();

    let bonusCommand = new CommandBuilder("General.Bonus")
        .on(["монеты", "бонус", "дейлик"])
        .do((state, api, msg) => {
            let currentDate = new Date();
            let oneDay = 1 * 20 * 60 * 60 * 1000; //20 hours to make exp. more smooth
            let dayAgo = Date.now() - oneDay;

            let bonusInfo = state.bonuses[msg.from.id];
            
            if ( !bonusInfo || (new Date(new Date(bonusInfo.lastClaimed).getTime() + oneDay) <= currentDate) ){
                if (!bonusInfo){
                    bonusInfo = new BonusModel(currentDate, 0);
                }

                let rewardBase = 1000;
                let coeff = Math.pow(1.1, bonusInfo.streak);

                let reward = Math.floor(rewardBase * coeff);

                state.users[msg.from.id] += reward;
                api.send(`🎁 ${msg.from.first_name} забирает еждневный бонус в ${reward} монет.`, msg.chat.id);

                state.bonuses[msg.from.id] = new BonusModel(currentDate, bonusInfo.streak + 1);
            }
            else{
                api.send(`😥 ${msg.from.first_name}, ты уже забирал свой бонус! Попробуй через ${Math.ceil(Math.abs(new Date(bonusInfo.lastClaimed) - dayAgo) / 36e5)} часов.`, msg.chat.id);
            }
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
        .disabled()
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
        .disabled()
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
        .disabled()
        .build();

    let helpCommand = new CommandBuilder("General.Help")
        .on(["/help@chz_casino_bot", "/help"])
        .do((state, api, msg, result) => {
            let message = "❓ *Актуальные команды бота* ❓\n";
            message += " - *баланс* _(показывает ваш актуальный баланс)_\n";
            message += " - *бонус* _(забирает ежедневный бонус)_\n";
            message += " - *топ*  _(топ чата по балансу на текущий момент)_\n";
            message += " - *рулетка [ставка] [значение]* _(числа от 0 до 12, выбери правильный цвет или число и получи приз)_\n";
            message += " - *бандит [ставка]* _(классика игровых слотов)_\n";
            message += " - *куб [ставка] [сторона кубика]* _(числа от 1 до 6)_\n";
            message += " - *промо [код]* _(активация промокода)_\n";
            api.send(message, msg.chat.id, true);
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

    return [balanceCommand
        ,creditCommand
        ,plusCommand
        ,topCommand
        ,bottomCommand
        ,helpCommand
        ,promoCommand
        ,listCommand
        ,statusCommand
        ,bonusCommand
    ];
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

    let cancelCommand = new CommandBuilder("Roullete.CancelBet")
        .on(["отмена", "отменить"])
        .do((state, api, msg) => {
            let game = games.get("roullete", msg.chat.id);

            game.cancel(msg.from.id, state, api, msg.chat.id);
        })
        .build();
        
    let doubleCommand = new CommandBuilder("Roullete.Double")
        .on("удвоить")
        .do((state, api, msg) => {
            let game = games.get("roullete", msg.chat.id);

            game.double(msg.from.id, state, api, msg.chat.id);
        })
        .build();

    let repeatCommand = new CommandBuilder("Roullete.Repeat")
        .on(["повтор", "повторить"])
        .do((state, api, msg) => {
            let game = games.get("roullete", msg.chat.id);

            game.repeat(msg.from.id, state, api, msg.chat.id);
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
        .on(["го", "крутить"])
        .when((state, msg) => {
            let game = games.get("roullete", msg.chat.id);

            return game.state == STATE.Betting;
        })
        .do((state, api, msg, result) => {

            let game = games.get("roullete", msg.chat.id);
            let gifToShow = Math.random() > 0.6 
                ? "roulette" 
                : Math.random() > 0.3 
                    ? "roulette2"
                    : "roulette3";

            game.state = STATE.Spinning;
            api.send("🎲 Крутим...", msg.chat.id);
            api.gif(gifToShow, 5000, msg.chat.id);

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
                    let message = game.bet(betOn, valueToBet, msg.from.id, msg.from.first_name, state, msg.chat.id, api);
                    api.send(message, msg.chat.id);
                }
            }
        })
        .build();

    return [logCommand
        ,roulleteCommand
        ,betCommand
        ,goCommand
        ,autostartCommand
        ,betsCommand
        ,cancelCommand
        ,doubleCommand
        ,repeatCommand
    ];
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
        .disabled()
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
