class Bandit {
    constructor() {
        this.onCooldown = false;
        this.wheelValues = ['💰', '💩', '💩', '💩', '🗑️','🗑️','🗑️','🗑️', '🔥','🔥', '🔥', '🔥', '🔥', '🔥', '🔥', '🔥', '❤️', '❤️', '❤️', '❤️', '🍆', '🍆', '🍀'];
    }

    roll(value, userId, userName, state, api, chatId) {
        if (this.onCooldown){
            api.send(`🎱 Заряжаем автомат, подождите...`, chatId);
            state.users[userId] += value;
            return;
        }

        let wheel = [...this.wheelValues, ...this.wheelValues, ...this.wheelValues];
        wheel = wheel.sort(() => Math.random() - 0.5);

        let rolls = wheel.slice(0, 3);

        let low = rolls.filter(x => x == '🔥' || x == '💰');
        let mid = rolls.filter(x => x == '❤️' || x == '💰');
        let high = rolls.filter(x => x == '🍆' || x == '💰');
        let top = rolls.filter(x => x == '🍀' || x == '💰');

        let coeff = 1;
        if (top.length > 1) {
            coeff += (0.4 * top.length);
        } 
        
        if (high.length > 1) {
            coeff += (0.3 * high.length);
        } 
        
        if (mid.length > 1) {
            coeff += (0.2 * mid.length);
        } 
        
        if (low.length > 1) {
            coeff += (0.1 * low.length);
        }
        
        if (coeff == 1)
            coeff = 0;
        
        if (top.length == 3 || high.length == 3 || mid.length == 3 || low.length == 3)
            coeff += 5;

        let bonus = rolls.filter(x => x == '💰');

        let prize = Math.floor(value * coeff);
        state.users[userId] += prize;

        let resultMessage = "🎱 Бандит 🎱\n";
        resultMessage += `${rolls[0]} | ${rolls[1]} | ${rolls[2]}\n`;
        if (prize > 0) {
            resultMessage += `${userName} выиграл ${prize}`;

            if (bonus.length > 0) {
                state.users[userId] += value * bonus.length;
                resultMessage += `\nБонус за 💰: ${ value * bonus.length}`;
            }
        }
        else
            resultMessage += "Никто не выиграл";

        api.send(resultMessage, chatId);

        this.onCooldown = true;
        setTimeout(() => this.onCooldown = false, 500);
    }
}

module.exports = Bandit;