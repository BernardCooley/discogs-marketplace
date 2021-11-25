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

            const fullTracklist = await getAllReleases(getSellRequests($, details));

            searchAllNewTracks(fullTracklist);
        })
        .catch(console.error);
}

const getSellRequests = (cheerio, details) => {
    const sellRequests = [];
    details.each(async (i, elem) => {
        sellRequests.push(axios(`${baseUrl}${cheerio(elem).find('a.item_description_title').attr('href')}`));
    });
    return sellRequests;
}

const getAllReleases = async (sellRequests) => {
    return Promise.all(sellRequests).then((response) => {
        const sellHtmls = response;

        const fullTracklist = [];
        sellHtmls.forEach((sellHtml => {
            $ = cheerio.load(sellHtml.data);
            const tracklist = $('.playlist > tbody > tr');
            fullTracklist.push(...getReleaseTracklist($, tracklist));
        }));

        return listOfTags = fullTracklist,
            keys = ['artist', 'title'],
            filtered = listOfTags.filter(
                (s => o =>
                    (k => !s.has(k) && s.add(k))
                        (keys.map(k => o[k]).join('|'))
                )
                    (new Set)
            );
    });
}

const purgeString = (string) => {
    let newString = string.replace(/ +(?= )/g, '');

    if (newString[newString.length-1] === '*') {
        newString = newString.substring(0, newString.length - 1);
    }
    return newString;
}

const getReleaseTracklist = (cheerio, tracklist) => {
    const list = [];

    tracklist.each(function () {
        const releaseArtist = cheerio('.profile > h1 > span:nth-of-type(1)').text().trim().replace(/(\r\n|\n|\r)/gm, "");
        const trackArtist = cheerio(this).find('.tracklist_track_artists > a').text().trim();
        const title = cheerio(this).find('.tracklist_track_title > span').text().trim();

        const artist = (trackArtist.length > 0 ? trackArtist : releaseArtist);

        const track = {
            artist: purgeString(artist),
            title: purgeString(title)
        }

        list.push(track);
    });

    return list;
}

const searchAllNewTracks = async (fullTracklist) => {
    const date = new Date();
    fs.appendFile('alreadyListened.txt', `\n\n${date}\n`, function (err) {
        if (err) throw err;
    });


    fullTracklist.forEach(track => {
        const searchString = `${track.artist[track.artist.length - 1] === ')' ? track.artist.substring(0, track.artist.length - 4) : track.artist.replace('*', '')} - ${track.title}`;

        const string = `https://www.youtube.com/results?search_query=${searchString.replace(/ /g, '+')}`;

        if (!listened.includes(string) && track.artist.length > 0 && track.title.length > 0) {
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
            console.log(`Skipping ${track.title} - ${track.artist}`);
        }
    })
}

lr.on('end', function () {
    if (listType === '--help') {
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

        if (listType === 'new-listings') {
            fullUrl = `${baseUrl}sell/list?year1=${startYear}&year2=${currentYear}&currency=GBP&style=Techno&format=Vinyl&format_desc=12%22&page=${page}`;
        } else if (listType === 'new-releases') {
            fullUrl = `${baseUrl}sell/list?year1=${currentYear}&year2=${currentYear}&currency=GBP&style=Techno&format=Vinyl&format_desc=12%22&page=${page}`
        } else {
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