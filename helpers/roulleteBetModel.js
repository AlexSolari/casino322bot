class BetModel {
    constructor(on, value, userId, userName){
        this.on = on;
        this.value = value;
        this.userId = userId;
        this.userName = userName;

        this.id = Math.random();
    }
}

module.exports = BetModel;