// Aggro's trophy house — public museum data, independent of the Notion hunt tracker.
// A trophy appears in the photographed gallery ONLY if status is "owned" and image is set.
// A planned trophy never contributes to an ownership claim.
// Screenshot paths can be local (/assets/imgs/ffxiv/housing/trophies/...) or external HTTPS URLs.

const exhibits = [
  {
    id: 'auxesian-tower-replica',
    name: 'Auxesian Tower Replica',
    wing: 'hall',
    expansion: 'Dawntrail',
    source: 'Universal Acclaim achievement',
    note: 'The kind of centrepiece the whole hall is built around.',
    status: 'planned',
    image: '',
    photos: [],
    obtained: '',
  },
  {
    id: 'trophy-of-light',
    name: 'Trophy of Light',
    wing: 'hall',
    expansion: 'Shadowbringers',
    source: 'Warrior of Light encounter',
    note: 'A little monument to the battles that mattered.',
    status: 'planned', image: '', photos: [], obtained: '',
  },
  {
    id: 'trophy-of-eternal-darkness',
    name: 'Trophy of Eternal Darkness',
    wing: 'hall',
    expansion: 'Shadowbringers',
    source: 'Hades encounter',
    note: 'For the dramatic side of the museum.',
    status: 'planned', image: '', photos: [], obtained: '',
  },
  {
    id: 'sildihn-banner',
    name: "Sil'dihn Banner",
    wing: 'hall',
    expansion: 'Endwalker',
    source: 'Criterion Savage manuscript exchange',
    note: 'Proof that some treasures really should be framed.',
    status: 'planned', image: '', photos: [], obtained: '',
  },
  {
    id: 'savage-gordian-bureau',
    name: 'Savage Gordian Bureau',
    wing: 'basement',
    expansion: 'Heavensward',
    source: 'Alexander Savage materials',
    note: 'One of the old raid relics for the basement wing.',
    status: 'planned', image: '', photos: [], obtained: '',
  },
  {
    id: 'orthos-display-stand',
    name: 'Orthos Display Stand',
    wing: 'garden',
    expansion: 'Endwalker',
    source: 'Eureka Orthos achievement and exchange',
    note: 'Something strange and glorious to drag outside.',
    status: 'planned', image: '', photos: [], obtained: '',
  },
  {
    id: 'traverse-clocktower',
    name: 'Traverse Clocktower',
    wing: 'garden',
    expansion: 'Dawntrail',
    source: 'Occult Crescent exchange',
    note: 'An ambitious outdoor landmark.',
    status: 'planned', image: '', photos: [], obtained: '',
  },
  {
    id: 'crumbling-aqueduct',
    name: 'Crumbling Aqueduct',
    wing: 'garden',
    expansion: 'Dawntrail',
    source: 'High-level crafting',
    note: 'Perfect for a slightly overgrown museum garden.',
    status: 'planned', image: '', photos: [], obtained: '',
  },
  {
    id: 'corvosi-screen',
    name: 'Corvosi Screen',
    wing: 'upper',
    expansion: 'Dawntrail',
    source: 'Variant dungeon brass exchange',
    note: 'A little bit of a whole other adventure brought home.',
    status: 'planned', image: '', photos: [], obtained: '',
  },
];

const wings = [
  {
    id: 'hall', icon: '✦', eyebrow: 'ground floor', title: 'Hall of Heroes',
    text: 'The big, story-rich centrepieces: the Warrior of Light, legendary encounters and proof of extraordinary adventures.',
    details: 'Trophy of Light · Divine Light & Eternal Darkness · The Twelve',
  },
  {
    id: 'basement', icon: '⚔', eyebrow: 'basement', title: 'Things That Should Have Killed Me',
    text: 'A slightly dramatic basement for raids, primals, Deep Dungeon relics and hard-won victories.',
    details: 'Coils · Alexander · Eureka Orthos',
  },
  {
    id: 'upper', icon: '◇', eyebrow: 'upper floor', title: 'Places I Have Been',
    text: 'Expeditions, local cultures and little things worth bringing home, with the rare-fish gallery nearby.',
    details: 'Eureka · Bozja · North Horn · Shared FATEs',
  },
  {
    id: 'garden', icon: '❀', eyebrow: 'outdoors', title: 'The Garden of Monuments',
    text: 'The old mushroom garden, but with some truly unreasonable trophies standing among the flowers.',
    details: 'Orthos · Traverse Clocktower · outdoor treasures',
  },
];

const aquariums = [
  { expansion: 'A Realm Reborn', short: 'ARR' },
  { expansion: 'Heavensward', short: 'HW' },
  { expansion: 'Stormblood', short: 'SB' },
  { expansion: 'Shadowbringers', short: 'ShB' },
  { expansion: 'Endwalker', short: 'EW' },
  { expansion: 'Dawntrail', short: 'DT' },
];

// Photograph your exhibit, then change status to "owned" and set image.
// Optional photos: [{ image: '/assets/imgs/.../extra.jpg', caption: 'A closer look' }]
// For example, after you ACTUALLY obtain and photograph a trophy:
//   status: 'owned', image: '/assets/imgs/ffxiv/housing/trophies/my-trophy.jpg'
// Its source and personal note will display in the gallery and in the click-to-enlarge view.

export default {
  title: "Aggro's Trophy House",
  subtitle: 'a museum of hard-won treasures, little victories & things with stories to tell ♡',
  wings,
  aquariums,
  exhibits,
  photographed: exhibits.filter(item => item.status === 'owned' && Boolean(item.image)),
  hunted: exhibits.filter(item => item.status !== 'owned'),
  note: 'An exhibition of accomplishments, not a shopping checklist. Only photographed, owned trophies appear in the cabinet.',
};
