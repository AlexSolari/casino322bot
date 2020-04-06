class BotApiHelper {
    constructor(botWrapper) {
        this.botWrapper = botWrapper;
        this.bot = botWrapper.bot;
    }

    sendRollingMessage(chatId) {
        /*let getRandomRollValue = (min, max) => {
            min = 0;
            max = 12;
            let number = Math.floor(Math.random() * (max - min + 1)) + min;
            let onMarker = '';
            if (number % 2 == 0)
                onMarker = '🔴';
            if (number % 2 == 1)
                onMarker = '⚫️';
            if (number == 0)
                onMarker = '💚';
            return `${number}${onMarker}`;
        }

        return this.bot.sendMessage(chatId, getRandomRollValue())
            .then(x => {
                setTimeout(() => this.bot.editMessageText({ chatId, messageId: x.message_id }, getRandomRollValue()), 1000);
                setTimeout(() => this.bot.editMessageText({ chatId, messageId: x.message_id }, getRandomRollValue()), 2000);
                setTimeout(() => this.bot.editMessageText({ chatId, messageId: x.message_id }, getRandomRollValue()), 3000);
                setTimeout(() => this.bot.editMessageText({ chatId, messageId: x.message_id }, getRandomRollValue()), 4000);
                setTimeout(() => this.bot.editMessageText({ chatId, messageId: x.message_id }, getRandomRollValue()), 5000);
                setTimeout(() => this.bot.deleteMessage(chatId, x.message_id), 6000);
            });*/

    }

    getUserStatus(userId){
        return {
            isRestricted: this.botWrapper.restrictedUsers.indexOf(userId) != -1,
            balance: this.botWrapper.state.users[userId],
            hasActiveCredits: this.botWrapper.state.activeCredits.indexOf(userId) != -1
        }
    }

    dice(chatId){
        return this.bot.sendDice(chatId);
    }

    send(text, chatId) {
        return this.bot.sendMessage(chatId, text, { parseMode: "Markdown" })
            .catch(e => console.error(e));
    }

    gif(name, timeout, chatId) {
        let path = `./content/${name}.mp4`;
        return this.bot.sendAnimation(chatId, path)
            .then(x => setTimeout(() => this.bot.deleteMessage(chatId, x.message_id), timeout))
            .catch(e => console.error(e));
    }

    save() {
        this.botWrapper.saveState();
    }

    getUser(id, chatId) {
        return this.bot.getChatMember(chatId, id);
    }

    forward(chatId, fromChatId, msgId) {
        return this.bot.forwardMessage(chatId, fromChatId, msgId)
        .catch(e => console.error(e));
    }
}

module.exports = BotApiHelper;