class Dice {
    constructor() {
        this.forwardFrom = 65947221;
        this.dices ={
            1 : 6995,
            2 : 6993,
            3 : 6990,
            4 : 6992,
            5 : 6994,
            6 : 6991,
        };
        this.log = [];
    }

    getDice() {
        let min = 1;
        let max = 6;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    roll(value, betOn, userId, userName, state, api, chatId) {
        state.users[userId] -= value;
        let diceValue = this.getDice();

        if (this.log.length >= 10){
            this.log.shift();
        }

        this.log.push(diceValue);

        let msgIdToSend = this.dices[diceValue];
        let resultMessage = "Никто не выиграл";

        if (diceValue == betOn){
            resultMessage = `${userName} выиграл ${value * 6}`;
            state.users[userId] += value * 6;
        }

        api.forward(chatId, this.forwardFrom, msgIdToSend);
        setTimeout(x => api.send(resultMessage, chatId), 2500);
    }

    showLog(api, chatId){
        let reply = "🎲 Лог:\n";
        this.log.forEach(e => {
            reply += `${e}\n`;
        })
        api.send(reply, chatId);
    }
}

module.exports = Dice;