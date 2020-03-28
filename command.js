class Command{
    constructor(trigger, condition, handler){
        this.trigger = trigger;
        this.condition = condition;
        this.handler = handler;
    }

    exec(message, state, api, botMessage){
        let shouldTrigger = false;
        let matchResult = null;
        
        if (typeof(this.trigger) == "string"){
            shouldTrigger = message.toLowerCase() == this.trigger;
        } else{
            matchResult = this.trigger.exec(message);

            shouldTrigger = matchResult && matchResult.length > 0;
        }

        if (shouldTrigger && this.condition(state, botMessage)){
            this.handler(state, api, botMessage, matchResult);
        }
    }
}

module.exports = Command;