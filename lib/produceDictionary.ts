/**
 * 무료 이미지 검색(Openverse)은 영어 검색어일 때 결과가 훨씬 많이 나온다.
 * 별도 번역 API(가입·키 필요)를 붙이는 대신, 동네 가게가 실제로 팔 법한
 * 과일·채소·식료품 이름을 미리 영어로 매핑해둔다. 사전에 없는 낯선 품목명은
 * 억지로 번역하지 않고 빈칸으로 남긴다 — 잘못된 검색어보다는 빈칸이 낫다.
 */
const KO_TO_EN: Record<string, string> = {
  // 과일
  사과: 'apple',
  배: 'asian pear',
  포도: 'grape',
  샤인머스캣: 'shine muscat grape',
  수박: 'watermelon',
  참외: 'korean melon',
  멜론: 'melon',
  딸기: 'strawberry',
  바나나: 'banana',
  오렌지: 'orange',
  한라봉: 'hallabong citrus',
  귤: 'tangerine',
  자몽: 'grapefruit',
  레몬: 'lemon',
  라임: 'lime',
  체리: 'cherry',
  키위: 'kiwi',
  망고: 'mango',
  파인애플: 'pineapple',
  복숭아: 'peach',
  천도복숭아: 'nectarine',
  자두: 'plum',
  무화과: 'fig',
  감: 'persimmon',
  대추: 'jujube',
  밤: 'chestnut',
  석류: 'pomegranate',
  블루베리: 'blueberry',

  // 채소
  토마토: 'tomato',
  방울토마토: 'cherry tomato',
  감자: 'potato',
  고구마: 'sweet potato',
  양파: 'onion',
  마늘: 'garlic',
  깐마늘: 'peeled garlic',
  대파: 'green onion',
  쪽파: 'chives',
  파: 'green onion',
  오이: 'cucumber',
  당근: 'carrot',
  브로콜리: 'broccoli',
  콜리플라워: 'cauliflower',
  상추: 'lettuce',
  양상추: 'iceberg lettuce',
  배추: 'napa cabbage',
  양배추: 'cabbage',
  무: 'korean radish',
  시금치: 'spinach',
  부추: 'garlic chives',
  애호박: 'zucchini',
  단호박: 'kabocha squash',
  호박: 'pumpkin',
  가지: 'eggplant',
  고추: 'chili pepper',
  청양고추: 'cheongyang chili pepper',
  피망: 'bell pepper',
  파프리카: 'paprika',
  버섯: 'mushroom',
  표고버섯: 'shiitake mushroom',
  느타리버섯: 'oyster mushroom',
  팽이버섯: 'enoki mushroom',
  콩나물: 'bean sprouts',
  숙주나물: 'mung bean sprouts',
  옥수수: 'corn',
  완두콩: 'green pea',
  깻잎: 'perilla leaf',

  // 곡물·유제품·기타 식료품
  계란: 'egg',
  달걀: 'egg',
  두부: 'tofu',
  우유: 'milk',
  치즈: 'cheese',
  요거트: 'yogurt',
  쌀: 'rice',
  현미: 'brown rice',
  잡곡: 'mixed grain',
  콩: 'soybean',
  팥: 'red bean',
  참기름: 'sesame oil',
  들기름: 'perilla oil',
  꿀: 'honey',
  견과류: 'mixed nuts',
  아몬드: 'almond',
  호두: 'walnut',
  땅콩: 'peanut',
  김: 'dried seaweed',
  미역: 'seaweed',

  // 수산·정육
  생선: 'fish',
  고등어: 'mackerel',
  갈치: 'hairtail fish',
  조기: 'yellow croaker',
  새우: 'shrimp',
  오징어: 'squid',
  문어: 'octopus',
  낙지: 'octopus',
  조개: 'clam',
  굴: 'oyster',
  소고기: 'beef',
  돼지고기: 'pork',
  삼겹살: 'pork belly',
  닭고기: 'chicken',
  닭: 'chicken',
}

// 긴 표제어부터 확인해야 "방울토마토"가 "토마토"보다 먼저 잡힌다
const SORTED_KEYS = Object.keys(KO_TO_EN).sort((a, b) => b.length - a.length)

/**
 * 품목명에서 검색창에 미리 채울 영어 단어를 추정한다.
 * 아는 단어면 영어를, 모르면 빈 문자열을 돌려준다(빈칸 = 사용자가 직접 입력).
 */
export function guessEnglishQuery(productName: string): string {
  // "사과 (부사)" 처럼 괄호 안 품종명은 떼고 기본 단어만 본다
  const base = productName
    .replace(/[(（][^)）]*[)）]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!base) return ''

  if (KO_TO_EN[base]) return KO_TO_EN[base]

  const noSpace = base.replace(/\s/g, '')
  if (KO_TO_EN[noSpace]) return KO_TO_EN[noSpace]

  for (const key of SORTED_KEYS) {
    if (base.includes(key)) return KO_TO_EN[key]
  }

  // 이미 영문(로마자) 위주 이름이면 그대로 쓴다
  if (/^[A-Za-z0-9\s.,'-]+$/.test(base)) return base

  return ''
}
