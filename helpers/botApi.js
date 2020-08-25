class BotApiHelper {
    constructor(botWrapper) {
        this.botWrapper = botWrapper;
        this.bot = botWrapper.bot;
        
        this.messageQueue = [];

        setInterval(() => {
            this._dequeueMessage();
        }, 35);
    }

    _dequeueMessage(){
        let message = this.messageQueue.pop();

        if (message){
            this.bot.sendMessage(message.chatId, message.text, { parseMode: message.format ? "Markdown" : undefined, replyToMessage: message.replyId })
                .catch(e => console.error(e));
        }
    }

    getUserStatus(userId){
        return {
            isRestricted: this.botWrapper.restrictedUsers.indexOf(userId) != -1,
            balance: this.botWrapper.state.users[userId],
            bonus: this.botWrapper.state.bonuses[userId],
        }
    }

    dice(chatId){
        return this.bot.sendDice(chatId);
    }

    send(text, chatId, format) {
        format = format || false;

        this.messageQueue.push({
            text,
            chatId,
            format,
            replyId: undefined
        });
    }

    reply(text, chatId, replyId){
        this.messageQueue.push({
            text,
            chatId,
            format: false,
            replyId
        });
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