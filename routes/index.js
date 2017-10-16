const express = require('express');
const router = express.Router();
const request = require('request'); // "Request" library
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const _ = require('lodash');

const clientID = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectURI = 'http://localhost:3000/callback';
const stateKey = 'spotify_auth_state';
const accessTokenKey = 'access_token';
const refreshTokenKey = 'refresh_token';
const playlistURL = 'https://api.spotify.com/v1/users/kostyan5/playlists/4EAYzS0YpAeg1MGMg87zN3';
const fairplay = require('../bin/fairplay');
const schedule_fairplay = require('../cron/schedule_fairplay');
const notify_players = require('../cron/notify_players');

const twilio = require('twilio');
const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);


/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const generateRandomString = function(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

/* GET home page. */
router.get('/', (req, res) => {
    const accessToken = req.cookies ? req.cookies[accessTokenKey] : null;
    if (false) {
        res.redirect('/playlist');
    } else {
        res.render('index', {title: 'Spotify FairPlay'});
    }
});

router.post('/login', (req, res) => {

    const state = generateRandomString(16);
    res.cookie(stateKey, state);

    // your application requests authorization
    const scope = 'playlist-read-collaborative playlist-modify-private playlist-modify-public user-read-currently-playing';
    
    const redirect_uri = req.headers.referer + 'callback';

    const queryString = querystring.stringify({
        response_type: 'code',
        client_id: clientID,
        scope: scope,
        redirect_uri,
        state: state
    });
    res.redirect(`https://accounts.spotify.com/authorize?${queryString}`);
});

router.get('/callback', (req, res) => {
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.cookies ? req.cookies[stateKey] : null;

    console.log({ code, state, storedState });

    if (state === null || state !== storedState) {
        console.log('State mismatch');
        let queryString = querystring.stringify({
            error: 'state_mismatch'
        });

        res.redirect(`/#${queryString}`);
    } else {
        const authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: req.headers.referer + 'callback',
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(`${clientID}:${clientSecret}`).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {

                const accessToken = body.access_token;
                const refreshToken = body.refresh_token;

                console.log(accessToken);

                const options = {
                    url: playlistURL,
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    json: true
                };

                console.log({ accessToken, refreshToken });

                res.cookie(accessTokenKey, accessToken);
                res.cookie(refreshTokenKey, refreshToken);
                res.redirect('/playlist');
            } else {
		console.log(error,body, response.statusCode);
                let queryString = querystring.stringify({
                    error: 'invalid_token'
                });

                res.redirect(`/#${queryString}`);
            }
        });
    }
});

router.get('/refresh_token', function(req, res) {

    // requesting access token from refresh token
    const refreshToken = req.cookies ? req.cookies[refreshTokenKey] : null;

    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': 'Basic ' + (new Buffer(`${clientID}:${clientSecret}`).toString('base64')) },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        },
        json: true
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            const accessToken = body.access_token;

            res.cookie(accessTokenKey, accessToken);
            console.log({ accessToken });
            res.redirect('/playlist');
        }
    });
});

router.get('/playlist', (req, res) => {
    const accessToken = req.cookies ? req.cookies[accessTokenKey] : null;
    console.log({ accessToken });
    const options = {
        url: playlistURL,
        headers: { 'Authorization': `Bearer ${accessToken}` },
        json: true
    };

    // use the access token to access the Spotify Web API
    request.get(options, function(error, response, playlistBody) {

        schedule_fairplay.t(playlistBody).then((sortedPlaylist) => {

            res.render('playlist', {
                title: playlistBody.name,
                tracks: playlistBody.tracks.items,
                shuffledTracks: sortedPlaylist.tracks.items,
                currentlyPlaying: {}
            });
        });
    });
});

module.exports = router;
