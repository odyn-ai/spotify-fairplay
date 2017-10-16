const request = require('request-promise');
const twilio = require('twilio');
const { Client } = require('pg');
const _ = require('lodash');
const pgClient = new Client();
const twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const currentlyPlayingURL = 'https://api.spotify.com/v1/me/player/currently-playing';

const getCurrentSong = async () => {
    const options = getOptions(currentlyPlayingURL);
    return request.get(options);
};

const getOptions = (url) => {
    return {
        url,
        headers: { 'Authorization': `Bearer ${process.env.API_ACCESS_TOKEN}` },
        json: true
    };
};

const sendText = (body, to) => {
    let message = twilioClient.messages.create({ body, to, from: '6179967286' })
    message.then((msg) => { console.log(msg.sid) });
    message.catch((err) => { console.error(err) });
}

let songID;


let pollForNewSong = () => {
    getCurrentSong().then((msg) => {
        if (_.isUndefined(songID)) {
            console.log('INIT SONG CHECK')
            songID = msg.item.id;
        } else if (songID !== msg.item.id) {
            songID = msg.item.id;
            console.log('SONG CHANGED');
            return notifyPlayer(songID);
        } else {
        }
    });
}

pollForNewSong();
setInterval(pollForNewSong, 10000);
