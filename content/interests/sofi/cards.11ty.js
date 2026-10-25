// Expose Sofi's existing Eleventy global data as a compact static JSON file.
export default class SofiCardsFeed {
  data() {
    return {
      permalink: '/sofi/cards.json',
      eleventyExcludeFromCollections: true,
    };
  }

  render({ sofiCards = [] }) {
    return JSON.stringify(sofiCards.map(card => ({
      code: card.code ?? '',
      character: card.character ?? '',
      series: card.series ?? '',
      gen: card.gen ?? '',
      type: card.type ?? '',
      event: card.event ?? '',
      isEvent: card.isEvent ?? '',
      element: card.element ?? '',
      frame: card.frame ?? '',
      glow: card.glow ?? '',
      note: card.note ?? '',
      favourite: card.favourite ?? false,
      tags: card.tags ?? [],
      image: card.image ?? '',
    })));
  }
}
