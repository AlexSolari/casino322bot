var Command = require("./command");

class CommandBuilder{
    constructor(){
        this.trigger = null;
        this.condition = () => true;
        this.handler = () => {};
    }

    on(trigger){
        this.trigger = trigger;

        return this;
    }

    when(condition){
        this.condition = condition;

        return this;
    }

    do(handler){
        this.handler = handler;

        return this;
    }

    build(){
        return new Command(this.trigger, this.condition, this.handler);
    }
}

module.exports = CommandBuilder;