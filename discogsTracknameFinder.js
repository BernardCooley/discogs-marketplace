const axios = require('axios');
const cheerio = require('cheerio');
var exec = require('child_process').exec;

const alreadySearched = [
    {
        name: 'FlashbackLondon',
        pages: [
            {
                name: '1',
                date: '2020-04-20'
            },
            {
                name: '2',
                date: '2020-06-20'
            }
        ]
    }
];

let currentDate = new Date();
currentDate = currentDate.toISOString().slice(0, 10);

const seller = process.argv[2] || null;
const pageNumber = process.argv[3] || null;

const baseUrl = 'https://www.discogs.com';
const fullUrl = `${baseUrl}/seller/${seller}/profile?sort=listed%2Cdesc&limit=25&year1=2016&year2=2020&price1=5&price2=18&genre=Electronic&style=Techno&format=Vinyl&format_desc=12%22&page=${pageNumber}`;

const hasAlreadySearched = () => {
    const sellerDetails = alreadySearched.filter(sellerDetail => sellerDetail.name === seller);

    if (sellerDetails.length > 0) {
        if (sellerDetails[0].pages.filter(page => page.name === pageNumber).length > 0) {
            // Returning wrong
            if (sellerDetails[0].pages.filter(page => isWithinDate(2, page.date)).length > 0) {
                return true;
            }
            
        }
    }
    return false;
}

const isWithinDate = (numberOfMonths, lastVisited) => {
    console.log(Number(currentDate.substring(5, 7) - Number(lastVisited.substring(5, 7))) > numberOfMonths);
    if (Number(currentDate.substring(5, 7) - Number(lastVisited.substring(5, 7))) > numberOfMonths) {
        return false;
    }
    return true;
}

hasAlreadySearched();
// console.log(hasAlreadySearched());

const getTracknames = () => {
    axios(fullUrl)
        .then(response => {
            const html = response.data;
            const $ = cheerio.load(html);
            const details = $('.mpitems > tbody > tr');

            details.each(function (i, elm) {
                let sellUrl = `${baseUrl}${$(elm).find('a.item_description_title').attr('href')}`;

                axios(sellUrl)
                    .then(response => {
                        const sellHtml = response.data;
                        const $$ = cheerio.load(sellHtml);
                        const tracklist = $$('.playlist > tbody > tr');

                        tracklist.each(function (i, el) {
                            const releaseArtist = $$('.profile > h1 > span:nth-of-type(1)').text().trim();
                            const artist = $$(this).find('.tracklist_track_artists > a').text().trim();
                            const title = $$(this).find('.tracklist_track_title > span').text().trim();

                            const art = (artist.length > 0 ? artist : releaseArtist);

                            const searchString = `${art[art.length - 1] === ')' ? art.substring(0, art.length - 4) : art.replace('*', '')} - ${title}`;

                            const string = `https://www.youtube.com/results?search_query=${searchString.replace(/ /g, '+')}`

                            exec(`start chrome ${string}`, function (err) {
                                if (err) {
                                    console.log(err);
                                }
                            });
                        });
                    })
                    .catch(console.error);
            });
        })
        .catch(console.error);
}

// if (seller && pageNumber && !hasAlreadySearched()) {
//     getTracknames();
// }