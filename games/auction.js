class Auction{
    constructor(){
        this.inProgress = false;
        this.currentBet = 0;
        this.timeoutId = -1;
    }

    start(value, userId, userName, state, api, chatId){
        if (state.users[userId] < value)
        {
            api.send(`💵 Не хватает лаве что бы начать аукцион. Баланс ${state.users[userId]}, ставка ${value}`, chatId);
            return;
        }

        let startMessage = `💵 ${userName} запускает аукцион 💵\n`;
        startMessage += `Окончание аукциона через 60 секунд после последней ставки.\n`;

        api.send(startMessage, chatId);
        this.bet(value,userId,userName, state, api, chatId);
        
        this.inProgress = true;
    }

    bet(value, userId, userName, state, api, chatId){
        if (state.users[userId] < value)
        {
            api.send(`💵 Ставка не может превышать 100% от твоих средств. Баланс ${state.users[userId]}, ставка ${value}`, chatId);
            return;
        }

        if (value > this.currentBet){
            state.users[userId] -= value;
            this.currentBet += value;
            api.send(`💵 ${userName} добавляет ${value}.\nТекущая ставка: ${this.currentBet}`, chatId);

            clearTimeout(this.timeoutId);
            this.timeoutId = setTimeout(() => this.end(value,userId,userName, state, api, chatId), 60000);
        }else{
            api.send(`💵 Нельзя поставить меньше текущей ставки. Текущая ставка: ${this.currentBet}`, chatId);
        }
    }

    end(value, userId, userName, state, api, chatId){
        api.send(`💵 ${userName} забирает банк ${this.currentBet}.`, chatId);
        state.users[userId] += value

        this.inProgress = false;
        this.currentBet = 0;
    }
}

module.exports = Auction;