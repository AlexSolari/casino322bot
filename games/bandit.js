class Bandit {
    constructor() {
        this.wheelValues = ['💩', '💩', '💩', '🔥','🔥','🔥','🔥','🔥','🔥','❤️','❤️','❤️','❤️','🍆','🍆','🍀'];
    }

    roll(value, userId, userName, state, api, chatId){
        let wheel = [...this.wheelValues, ...this.wheelValues, ...this.wheelValues];
        wheel = wheel.sort(() => Math.random() - 0.5);

        let rolls = wheel.slice(0, 3);

        let low = rolls.filter(x => x == '🔥');
        let mid = rolls.filter(x => x == '❤️');
        let high = rolls.filter(x => x == '🍆');
        let top = rolls.filter(x => x == '🍀');

        let coeff = 0;
        if (low.length > 1){
            coeff = 1 + (0.2 * low.length);
        }
        else if (mid.length > 1){
            coeff = 1 + (0.4 * mid.length);
        }
        else if (high.length > 1){
            coeff = 1 + (0.9 * high.length);
        }
        else if (top.length > 1){
            coeff = 1 + (1.2 * top.length);
        }

        let prize = Math.floor(value * coeff); 
        state.users[userId] += prize;

        let resultMessage = "🎱 Бандит 🎱\n";
        resultMessage += `${rolls[0]} | ${rolls[1]} | ${rolls[2]}\n`;
        if (prize > 0)
            resultMessage += `${userName} выиграл ${prize}`;
        else
            resultMessage += "Никто не выиграл";

        api.send(resultMessage, chatId);
    }
}

module.exports = Bandit;