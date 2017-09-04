const CronJob = require('cron').CronJob;
const request = require('request-promise');

const playlistURL = 'https://api.spotify.com/v1/users/kostyan5/playlists/4EAYzS0YpAeg1MGMg87zN3';
const currentlyPlayingURL = 'https://api.spotify.com/v1/me/player/currently-playing';

new CronJob('* 1 * * * *', async () => {
    console.log('5 seconds passed');

    // get information about the playlist
    // get the currently playing song
    const [playlist, currentSong] = await Promise.all([
        getPlaylist(),
        getCurrentSong()
    ]);

    console.log(currentSong);

    // get the list of user IDs to reorder
    const names = getNamesToReorder(playlist.tracks.items, currentSong.item.id);

    const currentSongLocation = playlist.tracks.items.length - names.length - 1;
    console.log(currentSongLocation);
    console.log(names);
    // send to the feature to get the new ordering
    const newOrder = getNewOrder();

    const mappedNewOrder = mapNewOrder(newOrder, currentSongLocation);

    console.log(mappedNewOrder);

    // perform the ordering
    let nextToOrder = currentSongLocation;
    for (let i = 0; i < mappedNewOrder.length; i += 1) {
        const positionShift = mappedNewOrder[i];

        const result = await reorderPlaylist(
            Math.max(nextToOrder, positionShift.rangeStart),
            positionShift.insertBefore
        );

        nextToOrder += 1;
    }

}, null, true);


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

const getNamesToReorder = (tracks, currentSongID) => {
    let currentlyPlayingIndex = -1;

    tracks.forEach((item, idx) => {
        if (item.track.id === currentSongID) {
            currentlyPlayingIndex = idx;
        }
    });

    return tracks
        .filter((track, idx) => idx > currentlyPlayingIndex)
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

const mapNewOrder = (ordering, currentSongLocation) => {
    return ordering.map((value, idx) => ({
        rangeStart: currentSongLocation + idx + 1,
        insertBefore: currentSongLocation + value + 1
    })).sort((a, b) => {
        return a.insertBefore > b.insertBefore;
    });
};

const reorderPlaylist = async (currentPosition, newPosition) => {
    const options = getOptions(`${playlistURL}/tracks`);
    options.body = {
        range_start: currentPosition,
        range_length: 1,
        insert_before: newPosition,
    };

    return request.put(options);
} ;