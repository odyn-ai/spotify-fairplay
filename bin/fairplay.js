"use strict";

// const origList = ['Kon', 'Carter', 'Marc', 'Kon', 'Carter', 'Marc', 'Kon', 'Kon', 'Kon', 'Carter', 'Kon', 'Kon', 'Kon', 'Kon', 'Carter', 'Carter', 'Carter', 'Marc', 'Marc', 'Kon'];
// const after = ['Kon', 'Carter', 'Marc', 'Kon', 'Carter', 'Marc', 'Kon', 'Carter', 'Marc', 'Kon', 'Carter', 'Marc', 'Kon', 'Carter', 'Kon', 'Carter', 'Kon', 'Kon', 'Kon', 'Kon'];
//
// console.log(balancePlaylist(origList.slice()));

function calculatePlayCounts(playlist, startIndex, endIndex) {
  let playCounts = [];
  for (let i = startIndex; i <= endIndex; i++) {
    playCounts[playlist[i]] = playCounts[playlist[i]] ? playCounts[playlist[i]] + 1 : 1;
  }
  // console.log(playCounts);
  return playCounts;
}

function shouldMoveUp(playlist, pos) {
  const playCounts = calculatePlayCounts(playlist, 0, pos);
  const prevUserCounts = playCounts[playlist[pos-1]];
  const currentUserCounts = playCounts[playlist[pos]];
  return currentUserCounts < prevUserCounts;
}

// playlist = queued list of users
function balancePlaylist(playlist) {

  console.log(playlist);
  let newPos = Array.apply(null, new Array(playlist.length)).map(function (x, i) { return i; });

  for (let i = 1; i < playlist.length; i++) {
    let pos = i;
    // bubble the current song up until the counts are even
    while(shouldMoveUp(playlist, pos)) {
      // move curr song up by swapping with previous
      const temp = playlist[pos-1];
      playlist[pos-1] = playlist[pos];
      playlist[pos] = temp;
      // also update new pos to reflect this
      newPos[i] = newPos[i] - 1;
      const idx = newPos.findIndex(e => e === newPos[i]);
      newPos[idx] = newPos[idx] + 1;
      pos = pos - 1;
    }
  }

  // let newList = [];
  // for (let i=0; i < origList.length; i++) {
  //   newList[newPos[i]] = (origList[i]);
  // }
  console.log(newPos);
  return newPos;
}

module.exports.balancePlaylist = balancePlaylist;