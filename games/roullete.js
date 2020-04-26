const STATE = require("../helpers/roulleteState");
let AwardModel = require("../helpers/roulleteAwardModel");
let BetModel = require("../helpers/roulleteBetModel");

class Roullete {
    constructor() {
        this.bets = [];
        this.prevGameBets = [];
        this.availibleBets = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '0', 'к', "ч", "1-3", '4-6', '7-9', '10-12'];
        this.state = STATE.Idle;

        this.autoStart = false;
    }
    ///
    /// Internals
    ///

    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    getAwardRanges(value) {
        let awardRanges = [new AwardModel(value.toString(), 13)];

        if (value != 0) {
            if (value % 2 == 0) {
                awardRanges.push(new AwardModel("ч", 2));
            } else {
                awardRanges.push(new AwardModel("к", 2));
            }
        }

        let rangeValue = "";
        if (value > 0) {
            if (value <= 3)
                rangeValue = "1-3";
            else if (value <= 6)
                rangeValue = "4-6";
            else if (value <= 9)
                rangeValue = "7-9";
            else
                rangeValue = "10-12";

            awardRanges.push(new AwardModel(rangeValue, 4));
        }
        return awardRanges;
    }

    showResults(value, state, api, wins, chatId) {
        var resultMessage = `🎲 Рулетка: ${value} ${value == 0 ? '💚' : (value % 2 ? '🔴' : '⚫️')}\n`;

        this.bets.forEach(bet => {
            let optional = "";
            if (value == 0 && bet.on != "0") {
                let refund = Math.floor(bet.value / 2);
                state.users[bet.userId] += refund;
                optional = `. Возврат ${refund}.`;
            }
            let onMarker = bet.on;

            if (bet.on == 'к')
                onMarker = '🔴';
            if (bet.on == 'ч')
                onMarker = '⚫️';
            if (bet.on == '0')
                onMarker = '💚';

            resultMessage += `${bet.userName} ${bet.value} на ${(onMarker)}${optional}\n`;
        });

        if (wins.length > 0) {
            wins.forEach(winner => {
                resultMessage += `${winner.name} выиграл ${winner.value}\n`;
            });
        }
        else {
            resultMessage += "Никто не выиграл";
        }

        api.send(resultMessage, chatId);

        if (wins.length == 0) {
            api.gif("noone", 10000, chatId);
        }

        this.prevGameBets = this.bets;
        this.bets = [];
        api.save();
    }

    getLastBetOfUser(userId){
        let betsByUser = this.bets.filter(x => x.userId == userId);
        
        return betsByUser.pop();
    }

    ///
    /// Externals
    ///

    showBets(api, chatId){
        var resultMessage = `🎲 Текущие ставки:\n`;

        this.bets.forEach(bet => {
            let onMarker = bet.on;

            if (bet.on == 'к')
                onMarker = '🔴';
            if (bet.on == 'ч')
                onMarker = '⚫️';
            if (bet.on == '0')
                onMarker = '💚';

            resultMessage += `${bet.userName} ${bet.value} на ${(onMarker)}\n`;
        });

        api.send(resultMessage, chatId);
    }

    start(api, chatId) {
        if (this.state == STATE.Idle) {
            api.send("🎲 Минирулетка\n\
Угадайте число из: \n\
0💚 \n\
1🔴 2⚫️ 3🔴 4⚫️ 5🔴 6⚫️\n\
7🔴 8⚫️ 9🔴10⚫️11🔴12⚫️", chatId);
            this.state = STATE.Betting;
        }
        else {
            api.send("🎲 Рулетка уже запущена, делайте ставки", chatId);
        }
    }

    showLog(state, api, chatId) {
        let reply = "💬 Лог:\n";
        (state.log[chatId] || []).forEach(e => {
            reply += `${e} ${e == 0 ? '💚' : (e % 2 ? '🔴' : '⚫️')}\n`;
        })
        api.send(reply, chatId);
    }

    bet(on, value, userId, userName, state, chatId, api) {
        let existingBets = this.bets.filter(x => x.userId == userId);
        if (existingBets.length >= 5)
            return "😥 Нельзя делать более 5 ставок от одного человека."

        state.users[userId] -= value;

        let onMarker = on;
        if (on == 'к')
            onMarker = '🔴';
        if (on == 'ч')
            onMarker = '⚫️';
        if (on == '0')
            onMarker = '💚';

        this.bets.push(new BetModel(on, value, userId, userName));

        return `🎲 Ставка принята: ${userName} ${value} на ${onMarker}\n`;
    }

    cancel(userId, state, api, chatId){
        let lastBet = this.getLastBetOfUser(userId);

        if (lastBet){
            this.bets = this.bets.filter(x => x.id != lastBet.id);
            state.users[userId] += lastBet.value;

            let onMarker = lastBet.on;

            if (lastBet.on == 'к')
                onMarker = '🔴';
            if (lastBet.on == 'ч')
                onMarker = '⚫️';
            if (lastBet.on == '0')
                onMarker = '💚';

            let resultMessage = `❌ Ставка "${lastBet.value} на ${onMarker}" отменена`;

            api.send(resultMessage, chatId);
        }
    }

    double(userId, state, api, chatId){
        let lastBet = this.getLastBetOfUser(userId);
        if (lastBet){
            if (lastBet.value > state.users[userId]){
                api.send(`🎲 Не хватает монет для удвоения ставки. Баланс ${state.users[userId]}, ставка ${lastBet.value}`, chatId);
            }
            else{
                let message = this.bet(lastBet.on, lastBet.value, lastBet.userId, lastBet.userName, state, chatId, api);

                api.send(message, chatId);
            }
        }
    }

    repeat(userId, state, api, chatId){
        let betsFromPrevGame = this.prevGameBets.filter(x => x.userId == userId);

        if (betsFromPrevGame && betsFromPrevGame.length > 0){
            let totalValue = betsFromPrevGame.map(x => x.value).reduce((a, b) => a + b, 0);

            if (totalValue > state.users[userId]){
                api.send(`🎲 Не хватает монет для повторения ставок. Баланс ${state.users[userId]}, нужно ${totalValue}`, chatId);
            }
            else{
                let message = "";
                betsFromPrevGame.forEach(lastBet => {
                    message += this.bet(lastBet.on, lastBet.value, lastBet.userId, lastBet.userName, state, chatId, api);
                });
                api.send(message, chatId);
            }
        }
    }

    roll(state, api, chatId) {
        let result = this.getRandomInt(0, 12);
        let awardRanges = this.getAwardRanges(result);
        let wins = [];
        let log = state.log[chatId];

        if (!log) {
            log = state.log[chatId] = [];
        }
        while (log.length > 10) {
            log.shift();
        }

        log.push(result);

        let betsThatProcd = this.bets.filter(x => awardRanges.map(z => z.value).indexOf(x.on) != -1);
        betsThatProcd.forEach(b => {
            let ranges = awardRanges.filter(x => x.value == b.on);
            ranges.forEach(r => {
                let winCount = r.coeff * b.value;
                state.users[b.userId] += winCount;
                wins.push({ name: b.userName, value: winCount });
            });
        });

        this.showResults(result, state, api, wins, chatId);
        this.state = STATE.Idle;
    }
}

module.exports = Roullete;