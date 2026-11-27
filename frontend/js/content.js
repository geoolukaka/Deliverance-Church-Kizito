/* =========================================================
   DCI Kizito — EDIT THIS FILE for monthly / routine updates
   (no other code needs touching)
   ========================================================= */
window.DIC_CONTENT = {

  /* ---- BACKEND ADDRESS: paste your deployed backend URL here (ends with /api) ----
     Example: 'https://dci-kizito-api.onrender.com/api'
     Leave empty until the backend is deployed; the site still works, forms show a friendly message. */
  apiBase: '',

  /* ---- HERO & PAGE HEADERS (update monthly) ----
     1. Drop new photos in frontend/images/hero/ and list them in `slides`.
     2. For video: put an .mp4 (under ~8 MB, muted, 1280px wide works well)
        in frontend/videos/ and set `video: 'videos/december.mp4'`.
     Leave `video: ''` to use the photo slideshow only. */
  hero: {
    month: 'December 2026',
    theme: 'House of Love',
    headerImg: '',                      // e.g. 'images/hero/header.jpg' — background for inner-page headers
    /* Each slide: img (photo) and/or video (.mp4, muted, <8 MB) — both optional.
       Without an image the slide shows a brand-colour gradient. Add/remove slides freely. */
    slides: [
      { kicker: 'Welcome to', title: 'House of Love',
        text: 'A place of worship, community and transformation — right here in Kizito, Nairobi.',
        img: '', video: '', poster: '' },
      { kicker: 'This month', title: 'Deliverance for every heart',
        text: 'He hath sent me to heal the brokenhearted, to preach deliverance to the captives.', ref: 'Luke 4:18 (KJV)',
        img: '', video: '', poster: '', cta: [['Watch Sermons', '#sermons'], ['Upcoming Events', '#events']] },
      { kicker: 'Find your family', title: 'There is a group for you',
        text: 'Men, women, youth and teens, and neighbourhood fellowships across Kizito.',
        img: '', video: '', poster: '', cta: [['Explore Groups', '#group-men'], ['Plan a Visit', '#contact']] },
    ],
  },

  /* ---- VERSE OF THE MONTH (flip card on the home page) ---- */
  themeVerse: {
    text: 'The Spirit of the Lord is upon me, because he hath anointed me to preach the gospel to the poor; he hath sent me to heal the brokenhearted, to preach deliverance to the captives, and recovering of sight to the blind, to set at liberty them that are bruised.',
    ref: 'Luke 4:18 (KJV)',
  },

  /* ---- SOCIAL LINKS (put your real links in) ---- */
  social: {
    facebook:  'https://www.facebook.com/',
    instagram: 'https://www.instagram.com/',
    youtube:   'https://www.youtube.com/',
    tiktok:    'https://www.tiktok.com/',
    whatsapp:  'https://wa.me/254700000000',   // ← replace with the church WhatsApp number (country code, no +)
  },

  /* ---- Optional: Google Analytics ID. Only loads if a visitor accepts "Statistics" cookies. ---- */
  analytics: { gaId: '' },               // e.g. 'G-XXXXXXXXXX'

  /* ---- MINISTRY GROUPS ----
     events: [{ date:'2026-12-14', title:'Men’s Breakfast', time:'08:00', location:'Fellowship Hall' }]
     updates: [{ title:'New term begins', body:'…', date:'2026-12-01' }]
     (Group leaders can also post updates after logging in — those are saved in the database.) */
  groups: [
    { slug: 'men', page: 'group-men', name: 'Men’s Group', icon: 'groups',
      tagline: 'Brothers growing in faith, character and purpose.',
      about: 'A fellowship of men encouraging one another to lead with integrity at home, at work and in the church.',
      meets: 'Meeting details coming soon', leader: '', events: [], updates: [] },
    { slug: 'women', page: 'group-women', name: 'Women’s Group', icon: 'diversity_1',
      tagline: 'Women of faith, strengthened together.',
      about: 'A welcoming community for prayer, Bible study, mentorship and service.',
      meets: 'Meeting details coming soon', leader: '', events: [], updates: [] },
    { slug: 'youth', page: 'group-youth', name: 'Youth & Teens Group', icon: 'diversity_3',
      tagline: 'The next generation, on fire for God.',
      about: 'Worship, teaching, mentorship and fun for teens and young adults.',
      meets: 'Meeting details coming soon', leader: '', events: [], updates: [] },
  ],

  /* ---- FELLOWSHIP GROUPS (20 slots). Rename each, e.g. name:'Fellowship 3 — Kizito East' ---- */
  fellowships: Array.from({ length: 20 }, (_, i) => ({
    slug: 'fellowship-' + (i + 1), page: 'fellowship-' + (i + 1), name: 'Fellowship Group ' + (i + 1), icon: 'diversity_2',
    tagline: 'Meeting in homes, growing as family.',
    about: 'A neighbourhood fellowship for prayer, the Word and care for one another.',
    area: '', meets: 'Meeting details coming soon', leader: '', events: [], updates: [],
  })),

  /* ---- Shown on the Newsletter & Articles page until the database has posts ---- */
  articles: [
    { type: 'newsletter', title: 'Welcome to our new website', date: '2026-11-23', author: 'DCI Kizito',
      excerpt: 'Sermons, events, groups, giving and more — all in one place.',
      body: 'Welcome to the new home of Deliverance Church International, Kizito online. Here you will find sermons, upcoming events, pages for every ministry group, and a safe way to give via M-Pesa. Newsletters and articles will be posted here regularly.' },
  ],
};
