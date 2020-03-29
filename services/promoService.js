const fs = require('fs');

class PromoService{
    constructor(){

    }

    checkCode(code, callback){
        fs.readFile('promos.json', 'utf8', (err, data) => {
            if (err) {
                console.error(err);
            } else {
                let codes = JSON.parse(data);

                let matchedCodes = codes.filter(c => c.code == code);
                if (matchedCodes.length > 0){
                    callback(matchedCodes);

                    let codesToRemove = matchedCodes.filter(x => x.onetime).map(x => x.code);
                    let updatedCodes = codes.filter(x => codesToRemove.indexOf(x.code) == -1);

                    fs.writeFile('promos.json', JSON.stringify(updatedCodes), 'utf8', () => {});
                }
            }
        });
    }
}

module.exports = new PromoService();