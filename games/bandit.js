class Bandit {
    constructor() {
        this.wheelValues = ['💰', '💩', '💩', '💩', '🔥', '🔥', '🔥', '🔥', '🔥', '🔥', '❤️', '❤️', '❤️', '❤️', '🍆', '🍆', '🍀'];
    }

    roll(value, userId, userName, state, api, chatId) {
        let wheel = [...this.wheelValues, ...this.wheelValues, ...this.wheelValues];
        wheel = wheel.sort(() => Math.random() - 0.5);

        let rolls = wheel.slice(0, 3);

        let low = rolls.filter(x => x == '🔥' || x == '💰');
        let mid = rolls.filter(x => x == '❤️' || x == '💰');
        let high = rolls.filter(x => x == '🍆' || x == '💰');
        let top = rolls.filter(x => x == '🍀' || x == '💰');

        let coeff = 1;
        if (top.length > 1) {
            coeff += (1.2 * top.length);
        } 
        
        if (high.length > 1) {
            coeff += (0.9 * high.length);
        } 
        
        if (mid.length > 1) {
            coeff += (0.4 * mid.length);
        } 
        
        if (low.length > 1) {
            coeff += (0.2 * low.length);
        }
        
        if (coeff == 1)
            coeff = 0;

        let bonus = rolls.filter(x => x == '💰').length == 1;

        let prize = Math.floor(value * coeff);
        state.users[userId] += prize;

        let resultMessage = "🎱 Бандит 🎱\n";
        resultMessage += `${rolls[0]} | ${rolls[1]} | ${rolls[2]}\n`;
        if (prize > 0) {
            resultMessage += `${userName} выиграл ${prize}`;

            if (bonus) {
                state.users[userId] += value;
                resultMessage += `\nБонус за 💰: ${value}`;
            }
        }
        else
            resultMessage += "Никто не выиграл";

        api.send(resultMessage, chatId);
    }
}

module.exports = Bandit;