class Command{
    constructor(trigger, condition, handler, name){
        this.trigger = trigger;
        this.condition = condition;
        this.handler = handler;
        this.name = name;
    }

    exec(message, state, api, botMessage){
        let shouldTrigger = false;
        let matchResult = null;
        
        if (Array.isArray(this.trigger)){
            this.trigger.forEach(t => {
                let check = this.checkTrigger(message, t);
                shouldTrigger = shouldTrigger || check.shouldTrigger;
                matchResult = check.matchResult || matchResult
            });
        }else{
            let check = this.checkTrigger(message, this.trigger);
            shouldTrigger = shouldTrigger || check.shouldTrigger;
            matchResult = check.matchResult || matchResult
        }


        if (shouldTrigger && this.condition(state, botMessage)){
            console.log(` - Executing [${this.name}]`);
            this.handler(state, api, botMessage, matchResult);
        }
    }

    checkTrigger(message, trigger){
        let shouldTrigger = false;
        let matchResult = null;

        if (typeof(trigger) == "string"){
            shouldTrigger = message.toLowerCase() == trigger;
        } else{
            matchResult = trigger.exec(message);
            shouldTrigger = matchResult && matchResult.length > 0;
        }

        return {shouldTrigger, matchResult};
    }
}

module.exports = Command;