
const versions = [
  'FICHIER GUITAR PRO v5.00',
  'FICHIER GUITAR PRO v5.10'
];

module.exports = buf => {
  let version;
  let versionIndex;

  const readVersion = () => {
    /*if (version === null)*/ version = readStringByte(30);
  };

  const isSupportedVersion = (version) => {
    for (let i = 0; i < versions.length; i++) {
      if (versions[i] === version) {
        versionIndex = i;
        return true;
      }
    }
    return false;
  };

  const readUnsignedByte = () => {
    const num = buf.readUInt8();
    buf = buf.slice(1);
    return num;
  };

  const readByte = () => {
    const num = buf.readInt8();
    buf = buf.slice(1);
    return num;
  };

  const readInt = () => {
    const num = buf.readInt32LE();
    buf = buf.slice(4); 
    return num;
  };

  const readString = (size, len) => {
    if (typeof len == 'undefined') len = size;
    const bytes = buf.slice(0, size > 0
      ? size
      : len);
    buf = buf.slice(bytes.length);
    return bytes.toString('utf8', 0, len >= 0 && len <= bytes.length
      ? len
      : size);
  };

  const readStringByte = (size) => {
    return readString(size, readUnsignedByte());
  };

  const readStringByteSizeOfInteger = () => {
    return readStringByte(readInt() - 1);
  };

  const readStringInteger = () => {
    return readString(readInt());
  };

  const skip = (n) => {
    buf = buf.slice(n);
  };

  const readKeySignature = () => {
    let keySignature = readByte();
    if (keySignature < 0) keySignature = 7 - keySignature;
    skip(3);
    return keySignature;
  }

  readVersion();
  if (!isSupportedVersion(version)) throw new Error('unsupported version');

  const [, major, minor] = /v(\d+)\.(\d+)/.exec(version);

  const title = readStringByteSizeOfInteger();
  const subtitle = readStringByteSizeOfInteger();
  const artist = readStringByteSizeOfInteger();
  const album = readStringByteSizeOfInteger();
  const lyricsAuthor = readStringByteSizeOfInteger();
  const musicAuthor = readStringByteSizeOfInteger();
  const copyright = readStringByteSizeOfInteger();
  const tab = readStringByteSizeOfInteger();
  const instructions = readStringByteSizeOfInteger();

  const commentsLen = readInt();
  const comments = [];
  for (let i = 0; i < comments; i++) {
    comments.push(readStringByteSizeOfInteger());
  }

  const lyricTrack = readInt();
  const lyricFrom = readInt();
  const lyricText = readStringInteger();
  for (let i = 0; i < 4; i++) {
    readInt();
    readStringInteger();
  }

  // page setup
  skip(versionIndex > 0
    ? 49
    : 30);
  for (let i = 0; i < 11; i++) {
    skip(4);
    readStringByte(0);
  }

  const tempoValue = readInt();

  if (versionIndex > 0) skip(1);

  let keySignature = readKeySignature();

  // octave
  readByte();

  const channels = [];
  for (let i = 0; i < 64; i++) {
    let channel = {};
    channel.program = readInt();
    channel.volume = readByte();
    channel.balance = readByte();
    channel.chorus = readByte();
    channel.reverb = readByte();
    channel.phaser = readByte();
    channel.tremolo = readByte();
    channel.bank = i == 9
      ? 'default percussion bank'
      : 'default bank'
    if (channel.program < 0) channel.program = 0;
    skip(2);
    channels.push(channel);
  };
  skip(42);

  const measures = readInt();
  const tracks = readInt();

  const measureHeaders = [];
  for (let i = 0; i < measures; i++) {
    if (i > 0) skip(1);
    let flags = readUnsignedByte();
    let header = {};
    let timeSignature = header.timeSignature = {};
    header.number = i+1;
    header.start = 0;
    header.tempo = 120;
    header.repeatOpen = (flags & 0x04) != 0;
    if ((flags & 0x01) != 0) timeSignature.numerator = readByte();
    if ((flags & 0x02) != 0) timeSignature.denominator = readByte();
    if ((flags & 0x08) != 0) header.repeatClose = (readByte() & 0xff) - 1;
    if ((flags & 0x20) != 0) {
      let marker = header.marker = {};
      marker.measure = header.number;
      marker.title = readStringByteSizeOfInteger();
      let color = marker.color = {};
      color.r = readUnsignedByte();
      color.g = readUnsignedByte();
      color.b = readUnsignedByte();
    }
    if ((flags & 0x10) != 0) header.repeatAlternative = readUnsignedByte();
    if ((flags & 0x40) != 0) {
      keySignature = readKeySignature();
      skip(1);
    }
    if ((flags & 0x01) != 0 || (flags & 0x02) != 0) skip(4);
    if ((flags & 0x10) == 0) skip(1);
    let tripletFeel = readByte();
    if (tripletFeel === 1) header.tripletFeel = 'eigth';
    else if (tripletFeel === 2) header.tripletFeel = 'sixteents';
    else header.tripletFeel = 'none';
    measureHeaders.push(header);
  }

  return {
    version: { major, minor },
    title,
    subtitle,
    artist,
    album,
    lyricsAuthor,
    musicAuthor,
    copyright,
    tab,
    instructions,
    comments,
    lyrics: { track: lyricTrack, from: lyricFrom, text: lyricText },
    tempoValue,
    keySignature,
    channels,
    measures,
    tracks,
    measureHeaders
  };
};

if (!module.parent) {
  console.log(JSON.stringify(module.exports(require('fs').readFileSync(`${process.env.HOME}/Desktop/fekdich.gp5`)), null, '  '));
}
