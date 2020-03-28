class GameStore {
    constructor() {
        this.games = {

        };

        this.gameFactories = {

        }
    }

    addGame(name, factory){
        if (this.gameFactories[name] || this.games[name])
            return;

        this.gameFactories[name] = factory;
        this.games[name] = {};
    }

    get(name, chatId){
        if (this.gameFactories[name] || this.games[name]){
            if (!this.games[name][chatId])
                this.games[name][chatId] = this.gameFactories[name]();
            
            return this.games[name][chatId];
        }
        else{
            console.error(`Trying to get not-registered game [${name}]`);
        }
    }
}

module.exports = new GameStore();