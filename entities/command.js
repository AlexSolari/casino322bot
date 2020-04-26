const {
    performance
  } = require('perf_hooks');

class Command{
    constructor(trigger, condition, handler, name, active){
        this.trigger = trigger;
        this.condition = condition;
        this.handler = handler;
        this.name = name;

        this.active = active;
    }

    exec(message, state, api, botMessage){
        if (!this.active)
            return;

        let shouldTrigger = false;
        let matchResult = null;
        
        if (!Array.isArray(this.trigger)){
            this.trigger = [this.trigger];
        }

        this.trigger.forEach(t => {
            let check = this.checkTrigger(message, t);
            shouldTrigger = shouldTrigger || check.shouldTrigger;
            matchResult = check.matchResult || matchResult
        });

        if (shouldTrigger && this.condition(state, botMessage)){
            console.log(` - Executing [${this.name}] with arguments ${JSON.stringify(matchResult)}`);
            var t0 = performance.now();
            this.handler(state, api, botMessage, matchResult);
            var t1 = performance.now();
            console.log(` - [${this.name}] took ${(t1 - t0).toFixed(3)} ms.`);
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