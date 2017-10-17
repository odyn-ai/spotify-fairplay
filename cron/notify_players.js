const request = require('request-promise');
const twilio = require('twilio');
const { Pool, Client } = require('pg');
const _ = require('lodash');
const pool = new Pool();
const twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const currentlyPlayingURL = 'https://api.spotify.com/v1/me/player/currently-playing';
const playlistURL = 'https://api.spotify.com/v1/users/kostyan5/playlists/4EAYzS0YpAeg1MGMg87zN3';

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

const getPlaylist = async () => {
    const options = getOptions(playlistURL);
    return request.get(options);
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
            notifyPlayer(songID);
        } else if (songID !== msg.item.id) {
            songID = msg.item.id;
            console.log('SONG CHANGED');
            return notifyPlayer(songID);
        } else {
        }
    });
}

let notifyPlayer = (id) => {
    getPlaylist().then((playlist) => {
        let song = _.find(playlist.tracks.items, (item) => item.track.id === id);
        let query = 'SELECT * FROM players WHERE spotify_user = $1';
	pool.query(query, [song.added_by.id], (err, res) => {
	    let songName = song.track.name;
	    let songArtist = song.track.name;
	    let phoneNumber = res.rows[0].phone;
	    sendText(`Now Playing a song you added, ${songName}. Thanks a bushel!`, phoneNumber);
        });
    });
}

pollForNewSong();
setInterval(pollForNewSong, 10000);
