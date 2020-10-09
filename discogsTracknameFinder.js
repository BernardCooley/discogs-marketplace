const axios = require('axios');
const cheerio = require('cheerio');
var exec = require('child_process').exec;
const fs = require('fs');
const LineByLineReader = require('line-by-line');
const lr = new LineByLineReader('alreadyListened.txt');

const listened = [];

lr.on('line', function (line) {
    listened.push(line);
});

const baseUrl = 'https://www.discogs.com/';
const fullUrl = 'https://www.discogs.com/seller/The-Bear/profile?sort=listed%2Cdesc&limit=25&year1=2016&year2=2020&style=Techno&format=Vinyl&format_desc=12%22&page=1';

const getTracknames = () => {
    axios(fullUrl)
        .then(response => {
            const html = response.data;
            const $ = cheerio.load(html);
            const details = $('.mpitems > tbody > tr');

            if (details.length === 0) {
                console.log('No results');
            }

            details.each(function (i, elm) {
                let sellUrl = `${baseUrl}${$(elm).find('a.item_description_title').attr('href')}`;

                axios(sellUrl)
                    .then(response => {
                        const sellHtml = response.data;
                        const $$ = cheerio.load(sellHtml);
                        const tracklist = $$('.playlist > tbody > tr');

                        tracklist.each(function (i, el) {

                            const releaseArtist = $$('.profile > h1 > span:nth-of-type(1)').text().trim().replace(/(\r\n|\n|\r)/gm, "");
                            const artist = $$(this).find('.tracklist_track_artists > a').text().trim();
                            const title = $$(this).find('.tracklist_track_title > span').text().trim();

                            const art = (artist.length > 0 ? artist : releaseArtist);

                            const searchString = `${art[art.length - 1] === ')' ? art.substring(0, art.length - 4) : art.replace('*', '')} - ${title}`;

                            const string = `https://www.youtube.com/results?search_query=${searchString.replace(/ /g, '+')}`

                            if (!listened.includes(string)) {
                                exec(`start chrome ${string}`, function (err) {
                                    if (err) {
                                        console.log(err);
                                    }
                                });
                                fs.appendFile('alreadyListened.txt', `${string}\n`, function (err) {
                                    if (err) throw err;
                                });
                            }
                        });
                    })
                    .catch(console.error);
            });
        })
        .catch(console.error);
}

lr.on('end', function () {
    getTracknames();
});