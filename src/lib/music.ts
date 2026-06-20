export interface MusicTrack {
  id: string
  title: string
  artist: string
  fileName: string
  url: string
}

export const musicTracks: MusicTrack[] = [
  {
    id: "daisy-crown-empty-old-city-wuthering-waves",
    title: "Empty old City,Wuthering Waves,",
    artist: "Daisy Crown",
    fileName: "Daisy Crown - Empty old City,Wuthering Waves,.m4a",
    url: `${import.meta.env.BASE_URL}music/Daisy Crown - Empty old City,Wuthering Waves,.m4a`,
  },
  {
    id: "innocence-塞壬唱片-msr-松林凜",
    title: "塞壬唱片-MSR,ユリカリパブリック,松林凜",
    artist: "Innocence",
    fileName: "Innocence - 塞壬唱片-MSR,ユリカリパブリック,松林凜.m4a",
    url: `${import.meta.env.BASE_URL}music/Innocence - 塞壬唱片-MSR,ユリカリパブリック,松林凜.m4a`,
  },
  {
    id: "running-for-your-life-鸣潮先约电台-casey-lee-williams",
    title: "鸣潮先约电台,Casey Lee Williams,",
    artist: "RUNNING FOR YOUR LIFE",
    fileName: "RUNNING FOR YOUR LIFE - 鸣潮先约电台,Casey Lee Williams,.m4a",
    url: `${import.meta.env.BASE_URL}music/RUNNING FOR YOUR LIFE - 鸣潮先约电台,Casey Lee Williams,.m4a`,
  },
  {
    id: "speed-of-light-塞壬唱片-msr-dj-okawari-二宮愛",
    title: "塞壬唱片-MSR,DJ Okawari,二宮愛",
    artist: "Speed of Light",
    fileName: "Speed of Light - 塞壬唱片-MSR,DJ Okawari,二宮愛.m4a",
    url: `${import.meta.env.BASE_URL}music/Speed of Light - 塞壬唱片-MSR,DJ Okawari,二宮愛.m4a`,
  },
]
