export const foodGroups = [
  {
    label: '육류',
    items: [
      ['소고기', '🥩'],
      ['국거리용 소고기', '🥩'],
      ['돼지고기', '🍖'],
      ['삼겹살', '🥓'],
      ['닭고기', '🍗'],
      ['달걀', '🥚'],
    ],
  },
  {
    label: '채소',
    items: [
      ['상추', '🥬'],
      ['배추', '🥬'],
      ['당근', '🥕'],
      ['감자', '🥔'],
      ['토마토', '🍅'],
      ['양파', '🧅'],
    ],
  },
  {
    label: '과일',
    items: [
      ['사과', '🍎'],
      ['바나나', '🍌'],
      ['딸기', '🍓'],
      ['포도', '🍇'],
    ],
  },
  {
    label: '유제품/기타',
    items: [
      ['우유', '🥛'],
      ['치즈', '🧀'],
      ['김치', '🥬'],
      ['두부', '⬜'],
    ],
  },
];

export const firstFood = {
  category: '육류',
  subcategory: '육류',
  itemName: '소고기',
  emoji: '🥩',
};

export const unitOptions = ['개', '팩', '봉지', '통', '병', 'g', 'kg', 'ml', 'L'];

export function defaultExpiryDate(days = 7) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}
