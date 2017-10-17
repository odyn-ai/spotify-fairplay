const CronJob = require('cron').CronJob;
const request = require('request-promise');
const sleep = require('sleep');
const _ = require('lodash');
const { balancePlaylist } = require('../bin/fairplay');

const playlistURL = 'https://api.spotify.com/v1/users/kostyan5/playlists/4EAYzS0YpAeg1MGMg87zN3';
const currentlyPlayingURL = 'https://api.spotify.com/v1/me/player/currently-playing';

// new CronJob('0 * * * * *',
const t = async (playlist) => {
    // get information about the playlist
    // get the currently playing song
   /*
    const [playlist] = await Promise.all([
        getPlaylist()
    ]);
    */

    // get the list of user IDs to reorder
    const names = getNamesToReorder(playlist.tracks.items);


    // send to the feature to get the new ordering
    const newOrder = balancePlaylist(names);

    const mappedNewOrder = mapNewOrder(newOrder);

    let playcopy = _.cloneDeep(playlist);

    _.each(mappedNewOrder, (order, idx) => {
      playcopy.tracks.items[idx] = playlist.tracks.items[order.rangeStart];
    });

    let currentSongLocation = 0;

    return playcopy;

    // perform the ordering
    let nextToOrder = currentSongLocation;
    for (let i = 0; i < mappedNewOrder.length; i += 1) {
        const positionShift = mappedNewOrder[i];

        const result = await reorderPlaylist(
            Math.max(nextToOrder, positionShift.rangeStart),
            positionShift.insertBefore
        );

        sleep.sleep(1);
        nextToOrder += 1;
    }

    return playcopy;
};

const getPlaylist = async () => {
    const options = getOptions(playlistURL);
    return request.get(options);
};

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

const getNamesToReorder = (tracks) => {
    return tracks
        .map(track => track.added_by.id);
};

const getNewOrder = () => {
    return [
        3,
        0,
        1,
        2,
        4,
        5
    ];
};

const mapNewOrder = (ordering) => {
    return ordering.map((value, idx) => ({
        rangeStart: idx,
        insertBefore: value
    })).sort((a, b) => {
        if (a.insertBefore < b.insertBefore) {
            return -1;
        }

        return a.insertBefore === b.insertBefore ? 0 : 1;
    });
};

const reorderPlaylist = async (currentPosition, newPosition) => {
    const options = getOptions(`${playlistURL}/tracks`);
    options.body = {
        range_start: currentPosition,
        range_length: 1,
        insert_before: newPosition,
    };

    //console.log(`Current: ${currentPosition} New:${newPosition}`);
    console.log(options);
    return request.put(options);
} ;

//t();

module.exports.t = t;
