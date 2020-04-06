class Dice {
    constructor() {
        this.log = [];
    }

    roll(value, betOn, userId, userName, state, api, chatId) {
        state.users[userId] -= value;

        api.dice(chatId).then(r => {
            let diceValue = r.dice.value;

            if (this.log.length >= 10){
                this.log.shift();
            }
    
            this.log.push(diceValue);
    
            let resultMessage = "Никто не выиграл";
    
            if (diceValue == betOn){
                resultMessage = `${userName} выиграл ${value * 6}`;
                state.users[userId] += value * 6;
            }
            setTimeout(x => api.send(resultMessage, chatId), 2500);
        });
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