const axios = require('axios');
const cheerio = require('cheerio');
var exec = require('child_process').exec;
const fs = require('fs');
const LineByLineReader = require('line-by-line');
const lr = new LineByLineReader('alreadyListened.txt');

const listType = process.argv[2] || '';
const page = process.argv[3] || 1;
const yearSpan = process.argv[4] || 4;

let $;
const currentYear = new Date().getFullYear();
const startYear = Number(currentYear) - Number(yearSpan);
const listened = [];

const baseUrl = 'https://www.discogs.com/';

lr.on('line', function (line) {
    listened.push(line);
});

const getTracknames = async fullUrl => {
    axios(fullUrl)
        .then(async response => {
            const html = response.data;
            $ = cheerio.load(html);
            const details = $('.mpitems > tbody > tr');

            if (details.length === 0) {
                console.log('No results');
            }

            await getAllReleases($, details)
        })
        .catch(console.error);
}

const getAllReleases = async (cheerio, details) => {
    details.each(async (i, elem) => {
        let sellUrl = `${baseUrl}${cheerio(elem).find('a.item_description_title').attr('href')}`;

        axios(sellUrl)
            .then(async response => {
                const sellHtml = response.data;
                $ = cheerio.load(sellHtml);
                const tracklist = $('.playlist > tbody > tr');

                await searchAllNewTracks($, tracklist);
            })
            .catch(console.error);
    });
}

const searchAllNewTracks = async (cheerio, tracklist) => {
    tracklist.each(function () {

        const releaseArtist = cheerio('.profile > h1 > span:nth-of-type(1)').text().trim().replace(/(\r\n|\n|\r)/gm, "");
        const trackArtist = cheerio(this).find('.tracklist_track_artists > a').text().trim();
        const title = cheerio(this).find('.tracklist_track_title > span').text().trim();

        const artist = (trackArtist.length > 0 ? trackArtist : releaseArtist);

        const searchString = `${artist[artist.length - 1] === ')' ? artist.substring(0, artist.length - 4) : artist.replace('*', '')} - ${title}`;

        const string = `https://www.youtube.com/results?search_query=${searchString.replace(/ /g, '+')}`;

        if (!listened.includes(string) && artist.length > 0 && title.length > 0) {
            exec(`start chrome ${string}`, function (err) {
                if (err) {
                    console.log(err);
                }
            });
            fs.appendFile('alreadyListened.txt', `${string}\n`, function (err) {
                if (err) throw err;
            });
        }
        if (listened.includes(string)) {
            console.log(`Skipping ${title} - ${artist}`);
        }
    });
}

lr.on('end', function () {
    if(listType === '--help') {
        const help = {
            'command': 'node discogsTracknameFinder.js <seller> || "new-listings" || "new-releases" <page? || 1> <yearSpan? || 4>',
            'example1': 'node discogsTracknameFinder.js flashback',
            'example2': 'node discogsTracknameFinder.js flashback 1 4',
            'example3': 'node discogsTracknameFinder.js new-listings 3',
            'example4': 'node discogsTracknameFinder.js new-releases 2'
        }

        console.log(help);
    } else if (listType === '--removeFromListened') {
        console.log('remove from listened');
    } else {
        let fullUrl = ``;

        if(listType === 'new-listings') {
            fullUrl = `${baseUrl}sell/list?year1=${startYear}&year2=${currentYear}&currency=GBP&style=Techno&format=Vinyl&format_desc=12%22&page=${page}`;
        }else if (listType === 'new-releases') {
            fullUrl = `${baseUrl}sell/list?year1=${currentYear}&year2=${currentYear}&currency=GBP&style=Techno&format=Vinyl&format_desc=12%22&page=${page}`
        }else {
            fullUrl = `${baseUrl}seller/${listType}/profile?sort=listed%2Cdesc&limit=25&year1=${startYear}&year2=${currentYear}&style=Techno&format=Vinyl&format_desc=12%22&page=${page}`;
        }

        const searchCriteria = {
            'Seller': listType,
            'Year from': startYear,
            'Year to': currentYear,
            'Page': page
        }

        console.log(fullUrl);
        console.log(searchCriteria);

        listType.length > 0 ? getTracknames(fullUrl) : console.log('No listType added');
    }

});