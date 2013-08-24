var vlc = require('vlc')([
  '-I', 'dummy',
  '-V', 'dummy',
  '--verbose', '1',
 // '--no-video-title-show',
 // '--no-disable-screensaver',
 // '--no-snapshot-preview',
  //'--sout=#{access=http,mux=mp3,dst=localhost:8080}'
  '--sout=#http{dst=:8080/go.mpg}'
  // "'#standard{access=http,mux=mp3,dst=localhost:8080}'"
]);

var media = vlc.mediaFromFile(process.argv[2]);
media.parseSync();

media.track_info.forEach(function (info) {
  console.log(info);
});

console.log(media.artist, '--', media.album, '--', media.title);

var player = vlc.mediaplayer;
player.media = media;
console.log('Media duration:', media.duration);

player.play();
player.position = 0;

var poller = setInterval(function () {
  console.log('Poll:', player.position);  
}, 500);

// media.release();
// vlc.release();