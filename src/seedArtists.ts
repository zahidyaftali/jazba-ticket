// ── Starter artist roster ──────────────────────────────────────────────────
// Eleven South Asian artists with bios, photos and profile links researched
// from Wikipedia and Spotify (July 2026). Imported into Firestore through the
// admin panel's "Import roster" button — never written automatically.
//
// NOTE: hourlyRate (fee per event, USD) is an editable placeholder — booking
// fees are not public information. Adjust each one in the admin after import.

export interface SeedArtist {
  stageName: string;
  bio: string;
  category: 'music';
  subCategory: string;
  profileImage: string;
  coverImage: string;
  genres: string[];
  hourlyRate: number;
  location: string;
  experienceYears: number;
  availableNow: boolean;
  featured: boolean;
  socialLinks: { website: string; instagram: string; spotify: string; youtube: string };
  rating: number;
  totalReviews: number;
  eventsHosted: number;
  totalAudience: string;
  pastShows: { title: string; date: string; venue: string }[];
}

const blankStats = { rating: 0, totalReviews: 0, eventsHosted: 0, totalAudience: '', pastShows: [] as SeedArtist['pastShows'] };
const noSocials = { website: '', instagram: '', youtube: '' };

export const SEED_ARTISTS: SeedArtist[] = [
  {
    stageName: 'Abdul Hannan',
    subCategory: 'Indie-pop singer-songwriter',
    bio: 'Abdul Hannan is a Pakistani singer-songwriter whose stripped-back, emotional pop has made him one of the country\'s fastest-rising voices. Breakout singles like "Bikhra" and "Iraaday" with producer Rovalio earned tens of millions of streams, and he now draws over 2 million monthly listeners on Spotify. His intimate, confessional style has carried him from bedroom recordings to sold-out shows at home and abroad.',
    profileImage: '/images/artists/abdul-hannan.jpg',
    coverImage: '/images/artists/abdul-hannan.jpg',
    genres: ['Indie Pop', 'Urdu Pop', 'Singer-Songwriter'],
    hourlyRate: 6000,
    location: 'Lahore, Pakistan',
    experienceYears: 5,
    availableNow: true,
    featured: false,
    category: 'music',
    socialLinks: { ...noSocials, spotify: 'https://open.spotify.com/artist/5mWQT8CLTa4mAQAJdFjHb1' },
    ...blankStats,
  },
  {
    stageName: 'Adnan Dhool',
    subCategory: 'Lead vocalist — Soch the Band',
    bio: 'Adnan Dhool is the founder and lead vocalist of Soch the Band, the Lahore pop and Sufi-rock outfit he formed in 2010. The band broke through with "Awari", later featured in the Bollywood film Ek Villain, and their qawwali-inspired "Bol Hu" became a streaming phenomenon. On stage he pairs soaring Sufi vocals with a modern full-band production.',
    profileImage: '/images/artists/adnan-dhool.jpg',
    coverImage: '/images/artists/adnan-dhool.jpg',
    genres: ['Sufi Rock', 'Pop', 'Qawwali'],
    hourlyRate: 5000,
    location: 'Lahore, Pakistan',
    experienceYears: 15,
    availableNow: true,
    featured: false,
    category: 'music',
    socialLinks: { ...noSocials, spotify: 'https://open.spotify.com/artist/31y8hJ1vq1z54EPBOFdfRJ' },
    ...blankStats,
  },
  {
    stageName: 'Afsana Khan',
    subCategory: 'Punjabi playback singer',
    bio: 'Afsana Khan is an Indian Punjabi playback singer and songwriter from Bathinda who started out on Voice of Punjab in 2012. She is best known for the chart-topping "Titliaan" and for "Dhakka" with Sidhu Moose Wala, and reached a nationwide audience as a Bigg Boss 15 contestant. One of Punjabi music\'s most powerful female voices, she draws more than 8 million monthly listeners on Spotify.',
    profileImage: '/images/artists/afsana-khan.jpg',
    coverImage: '/images/artists/afsana-khan.jpg',
    genres: ['Punjabi', 'Playback', 'Pop'],
    hourlyRate: 7000,
    location: 'Bathinda, Punjab, India',
    experienceYears: 13,
    availableNow: true,
    featured: false,
    category: 'music',
    socialLinks: { ...noSocials, spotify: 'https://open.spotify.com/artist/4z0z82pXirH1TrygipQlOo' },
    ...blankStats,
  },
  {
    stageName: 'Ali Zafar',
    subCategory: 'Pop icon & Bollywood playback singer',
    bio: 'Ali Zafar is one of Pakistan\'s biggest entertainment exports — a singer-songwriter, actor and producer whose debut "Channo" made him a household name across South Asia. From the multi-platinum album Huqa Pani to Bollywood lead roles and PSL anthems, he has won five Lux Style Awards and earned a Filmfare nomination. Two decades of hits make him a guaranteed arena-filler.',
    profileImage: '/images/artists/ali-zafar.jpg',
    coverImage: '/images/artists/ali-zafar.jpg',
    genres: ['Pop', 'Rock', 'Playback'],
    hourlyRate: 15000,
    location: 'Lahore, Pakistan',
    experienceYears: 22,
    availableNow: true,
    featured: true,
    category: 'music',
    socialLinks: { ...noSocials, spotify: 'https://open.spotify.com/artist/3cKNppGLfcxdt9CtoHEZmQ' },
    ...blankStats,
  },
  {
    stageName: 'Annural Khalid',
    subCategory: 'R&B / chill-pop vocalist',
    bio: 'Annural Khalid is a Lahore-born singer-songwriter known for her soulful voice and chill-pop and R&B influences. Tracks like "Trust Issues" and "Dil De Bol" made her one of Pakistan\'s fastest-rising stars, now drawing over 8 million monthly listeners on Spotify. Her silky, late-night sound translates into an intimate, atmospheric live set.',
    profileImage: '/images/artists/annural-khalid.jpg',
    coverImage: '/images/artists/annural-khalid.jpg',
    genres: ['R&B', 'Chill Pop', 'Urdu'],
    hourlyRate: 5000,
    location: 'Lahore, Pakistan',
    experienceYears: 6,
    availableNow: true,
    featured: false,
    category: 'music',
    socialLinks: { ...noSocials, spotify: 'https://open.spotify.com/artist/1nCZUpBIcyOxufOx0lPeIW' },
    ...blankStats,
  },
  {
    stageName: 'Arieb Azhar',
    subCategory: 'Sufi folk & world musician',
    bio: 'Arieb Azhar is an Islamabad-based musician celebrated for his deep renderings of traditional Sufi poetry and folk song. After more than a decade performing in Croatia, he returned home and reached millions with "Husn-e-Haqiqi" on Coke Studio. His world-folk sound bridges Balkan strings and Punjabi mysticism.',
    profileImage: '/images/artists/arieb-azhar.jpg',
    coverImage: '/images/artists/arieb-azhar.jpg',
    genres: ['Sufi', 'Folk', 'World Music'],
    hourlyRate: 2500,
    location: 'Islamabad, Pakistan',
    experienceYears: 25,
    availableNow: true,
    featured: false,
    category: 'music',
    socialLinks: { ...noSocials, spotify: 'https://open.spotify.com/artist/0IuKvmIDo3KrY937MVh08P' },
    ...blankStats,
  },
  {
    stageName: 'Arif Lohar',
    subCategory: 'Punjabi folk legend',
    bio: 'Arif Lohar is a legend of Punjabi folk music and the son of iconic folk singer Alam Lohar. Armed with his signature chimta, he took "Jugni" to a global audience with the celebrated Coke Studio performance alongside Meesha Shafi, and holds Pakistan\'s Pride of Performance award. Half a century of family legacy — and still one of the most electric live acts in South Asian music.',
    profileImage: '/images/artists/arif-lohar.jpg',
    coverImage: '/images/artists/arif-lohar.jpg',
    genres: ['Punjabi Folk', 'Sufi', 'Bhangra'],
    hourlyRate: 12000,
    location: 'Lahore, Pakistan',
    experienceYears: 40,
    availableNow: true,
    featured: true,
    category: 'music',
    socialLinks: { ...noSocials, spotify: 'https://open.spotify.com/artist/1zs5AOsqD2b0YfmGNfWni4' },
    ...blankStats,
  },
  {
    stageName: 'ARMA',
    subCategory: 'Urban desi R&B artist',
    bio: 'ARMA is an urban desi artist blending Punjabi and Urdu hooks with UK R&B and hip-hop production. Singles like "Aaja Mahiya", "Daaku" and "Saiyaan Ji" have built him a loyal streaming audience across the South Asian diaspora. A natural fit for club nights and urban desi lineups.',
    profileImage: '/images/artists/arma.png',
    coverImage: '/images/artists/arma.png',
    genres: ['R&B', 'Urban Desi', 'Hip-Hop'],
    hourlyRate: 3000,
    location: 'United Kingdom',
    experienceYears: 6,
    availableNow: true,
    featured: false,
    category: 'music',
    socialLinks: { ...noSocials, spotify: 'https://open.spotify.com/artist/54JSrqrl6XcROWeVRKUU3y' },
    ...blankStats,
  },
  {
    stageName: 'Asim Azhar',
    subCategory: 'Pop singer-songwriter',
    bio: 'Asim Azhar is a Karachi-born singer, songwriter and actor who went from YouTube covers to arena headliner. Hits like "Jo Tu Na Mila", "Soneya" and "Habibi", plus Coke Studio appearances, made him one of Pakistan\'s defining pop voices with over 5 million monthly Spotify listeners. His full-band pop show runs from heartbreak ballads to festival singalongs.',
    profileImage: '/images/artists/asim-azhar.jpg',
    coverImage: '/images/artists/asim-azhar.jpg',
    genres: ['Pop', 'Urdu Pop', 'Playback'],
    hourlyRate: 8000,
    location: 'Karachi, Pakistan',
    experienceYears: 12,
    availableNow: true,
    featured: true,
    category: 'music',
    socialLinks: { ...noSocials, spotify: 'https://open.spotify.com/artist/1ZChN8G1Y7CJ0TXbrvblwS' },
    ...blankStats,
  },
  {
    stageName: 'Asim Riaz',
    subCategory: 'Rapper & performer',
    bio: 'Asim Riaz is an Indian rapper, model and performer from Jammu who shot to fame as the runner-up of Bigg Boss 13. He debuted with "Back To Start" in 2021 and has since built a catalogue of hard-hitting rap singles including "HIP HOP" and the "BUILT IN PAIN" series. A high-energy crossover act with a massive social following.',
    profileImage: '/images/artists/asim-riaz.png',
    coverImage: '/images/artists/asim-riaz.png',
    genres: ['Hip-Hop', 'Rap', 'Desi Rap'],
    hourlyRate: 6000,
    location: 'Mumbai, India',
    experienceYears: 5,
    availableNow: true,
    featured: false,
    category: 'music',
    socialLinks: { ...noSocials, spotify: 'https://open.spotify.com/artist/0uPcaDPyjSJPlCiYTZWQ1V' },
    ...blankStats,
  },
  {
    stageName: 'Asrar',
    subCategory: 'Sufi singer-songwriter',
    bio: 'Syed Asrar Shah, known simply as Asrar, is a Lahore-based Sufi singer-songwriter, composer and writer. He broke out on Coke Studio in 2014 with "Sab Aakho Ali Ali" and made his Bollywood debut with the smash "Afghan Jalebi" from Phantom, followed by the hit "Mayi Ri" from Ho Mann Jahan. His dhol-driven Sufi set is built for big open-air crowds.',
    profileImage: '/images/artists/asrar.jpg',
    coverImage: '/images/artists/asrar.jpg',
    genres: ['Sufi', 'Folk Fusion', 'Playback'],
    hourlyRate: 4000,
    location: 'Lahore, Pakistan',
    experienceYears: 15,
    availableNow: true,
    featured: false,
    category: 'music',
    socialLinks: { ...noSocials, spotify: 'https://open.spotify.com/artist/2pLpp8LjPF5qJAj8T3zzPn' },
    ...blankStats,
  },
];
