class BotApiHelper {
    constructor(botWrapper) {
        this.botWrapper = botWrapper;
        this.bot = botWrapper.bot;
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

    send(text, chatId, format) {
        format = format || false;
        return this.bot.sendMessage(chatId, text, { parseMode: format ? "Markdown" : undefined })
            .catch(e => console.error(e));
    }

    reply(text, chatId, replyId){
        return this.bot.sendMessage(chatId, text, { parseMode: "Markdown", replyToMessage: replyId })
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