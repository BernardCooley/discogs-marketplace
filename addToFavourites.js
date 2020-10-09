var exec = require('child_process').exec;
const fs = require('fs');
const LineByLineReader = require('line-by-line');
const lr = new LineByLineReader('favourites.txt');

const newFavourite = process.argv[2] || '';
const favourites = [];

lr.on('line', function (line) {
    favourites.push(line);
});

lr.on('end', function () {
    if(newFavourite.length > 0) {
        if (!favourites.includes(newFavourite)) {
            fs.appendFile('favourites.txt', `${newFavourite}\n`, function (err) {
                if (err) throw err;
            });   
        } else {
            console.log('Favourite already added');
        }
    }else {
        console.log('No favourite to add');
    }
});