// content/_data/ffxivGlams.js
//
// Aggro Phobic's actual wardrobe.
// Add exact gear names later only if you want them — the page no longer
// displays empty gear placeholders.

export default {
  intro:
    "Aggro’s wardrobe has apparently settled on one rule: start with black, add boots, then decide whether the accent colour is pink, red or a little bit radioactive. These are the six looks I keep coming back to.",

  categories: [
    "All",
    "Favourites",
    "Raid",
    "Witchy",
    "Cute",
    "Casual",
    "Comfy",
  ],

  looks: [
    {
      id: "pink-black",
      title: "Pink & Black Favourite",
      category: "Favourites",
      image: "/assets/imgs/ffxiv/glams/glam-pink-black.jpg",
      alt: "Aggro Phobic in a pink and black outfit with tall black boots.",
      note:
        "Probably the most Aggro outfit of the lot: soft pink against black, lots of little gold details, and boots doing half the work. Pretty without losing the slightly dangerous bit.",
      favourite: true,
    },
    {
      id: "industrial",
      title: "Industrial Gremlin",
      category: "Raid",
      image: "/assets/imgs/ffxiv/glams/glam-industrial.jpg",
      alt: "Aggro Phobic in a grey and black utility outfit with a face mask and large weapon.",
      note:
        "Monochrome utility pieces, heavy boots, straps everywhere and a mask that makes the whole thing look ready for a very questionable raid plan.",
      favourite: false,
    },
    {
      id: "red-hex",
      title: "Little Red Hex",
      category: "Witchy",
      image: "/assets/imgs/ffxiv/glams/glam-red-hex.jpg",
      alt: "Aggro Phobic in a black outfit with deep red embroidered sleeves and red hair accessories.",
      note:
        "Black with deep red embroidery and sharp little details. This one lands somewhere between witchy, festive and mildly cursed — which is a very useful place to be.",
      favourite: false,
    },
    {
      id: "off-duty",
      title: "Off-Duty Adventurer",
      category: "Casual",
      image: "/assets/imgs/ffxiv/glams/glam-off-duty.jpg",
      alt: "Aggro Phobic in a brown and black casual crop top and shorts outfit.",
      note:
        "The practical everyday one: warm neutrals, little utility straps and trainers. Looks like she actually has somewhere to be instead of standing in the house taking screenshots.",
      favourite: false,
    },
    {
      id: "red-street",
      title: "Red Streetwear",
      category: "Cute",
      image: "/assets/imgs/ffxiv/glams/glam-red-street.jpg",
      alt: "Aggro Phobic in a red crop top, black wide trousers and white trainers.",
      note:
        "A tiny flash of red in the middle of an otherwise black outfit, finished with white trainers. Very simple, very wearable, very 'I logged in to do one thing and stayed six hours'.",
      favourite: false,
    },
    {
      id: "black-cat",
      title: "Black Cat Off-Duty",
      category: "Comfy",
      image: "/assets/imgs/ffxiv/glams/glam-black-cat.jpg",
      alt: "Aggro Phobic in an oversized black coat with black socks and paw-shaped slippers.",
      note:
        "Oversized black layers and the paw shoes are doing something extremely important for the overall seriousness of the outfit. This is the house-glam winner.",
      favourite: false,
    },
  ],

  repeatPieces: [
    {
      label: "Base palette",
      name: "black, charcoal & smoke",
      note:
        "Nearly every look starts dark. It makes the pink, red and teal details stand out without the outfit feeling too busy.",
    },
    {
      label: "Accent colours",
      name: "pink, red & teal",
      note:
        "The wardrobe keeps circling back to the same little pops of colour — including the teal streak in Aggro’s hair.",
    },
    {
      label: "Silhouette",
      name: "cropped tops + long legs",
      note:
        "Shorter tops, shorts or fitted waists paired with boots or long trousers show up over and over again.",
    },
    {
      label: "Necessary nonsense",
      name: "straps, boots & paw shoes",
      note:
        "Utility details keep the cute outfits from getting too sweet, and then the paw slippers ruin any remaining dignity.",
    },
  ],
};
