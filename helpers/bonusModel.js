class BonusModel {
    constructor(lastClaimed, streak){
        this.lastClaimed = lastClaimed;
        this.streak = streak;
    }
}

module.exports = BonusModel;