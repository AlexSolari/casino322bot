const STATE = require("../helpers/roulleteState");
let AwardModel = require("../helpers/roulleteAwardModel");

class Roullete {
    constructor() {
        this.bets = [];
        this.availibleBets = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '0', 'к', "ч", "1-3", '4-6', '7-9', '10-12'];
        this.state = STATE.Idle;
    }

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

        this.bets = [];
        api.save();
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

    bet(on, value, userId, userName, state) {
        state.users[userId] -= value;
        this.bets.push({ on, value, userId, userName });
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