class Command{
    constructor(trigger, condition, handler, name){
        this.trigger = trigger;
        this.condition = condition;
        this.handler = handler;
        this.name = name;
    }

    exec(message, state, api, botMessage){
        console.log(` - Recieved command [${this.name}]`);
        let shouldTrigger = false;
        let matchResult = null;
        
        if (typeof(this.trigger) == "string"){
            shouldTrigger = message.toLowerCase() == this.trigger;
        } else{
            matchResult = this.trigger.exec(message);

            shouldTrigger = matchResult && matchResult.length > 0;
        }

        if (shouldTrigger && this.condition(state, botMessage)){
            console.log(` - Executing [${this.name}]`);
            this.handler(state, api, botMessage, matchResult);
        }
    }
}

module.exports = Command;