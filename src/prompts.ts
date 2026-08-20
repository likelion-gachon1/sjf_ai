/**
 * MCM PORTAL World 배경 18조합의 이미지 생성 프롬프트를 조립한다.
 *
 * 파일명 규약은 프론트가 그대로 읽으므로 절대 변경하지 않는다:
 *   /worlds/{colorway}/{colorway}_{mood}_{journey}2.png
 */

export const COLORWAYS = ["pink", "beige"] as const;
export type Colorway = (typeof COLORWAYS)[number];

export const MOODS = ["sul", "calm", "confidence"] as const;
export type Mood = (typeof MOODS)[number];

export const JOURNEYS = ["city", "shop", "relax"] as const;
export type Journey = (typeof JOURNEYS)[number];

export interface WorldCombination {
  colorway: Colorway;
  mood: Mood;
  journey: Journey;
  /** 예: pink_calm_city2.png */
  fileName: string;
  /** 예: pink/pink_calm_city2.png */
  relativePath: string;
  prompt: string;
}

// 인물/텍스트/손/얼굴을 프롬프트에서 명시적으로 배제하는 이유:
// 1) 인물은 매장에서 크로마키로 실시간 합성되므로 배경에 이미 사람이 있으면 안 된다.
// 2) 손/얼굴/텍스트는 현재 이미지 생성 모델이 가장 자주 뭉개거나 왜곡하는 지점이라
//    럭셔리 브랜드 톤을 해치는 티가 나는 실패로 직결된다.
const BASE_PROMPT = [
  "A luxury travel-inspired background photograph for the MCM PORTAL brand experience.",
  "Editorial, high-fashion magazine quality: sophisticated, refined, elegant, high production value.",
  "Absolutely no people, no human figures, no hands, no faces, no body parts anywhere in the frame.",
  "No text, no typography, no signage lettering, no logos, no watermarks anywhere in the frame.",
  "Natural, believable wide-angle perspective with balanced depth of field.",
  "The scene is an empty, uncluttered environment intended as a chroma-key compositing backdrop:",
  "a real person will be composited into this scene in real time, so keep the mid-ground open and",
  "free of clutter that would visually collide with a standing figure.",
  "Wide horizontal 16:9 composition, cinematic editorial lighting, photographic realism.",
].join(" ");

const COLORWAY_FRAGMENTS: Record<Colorway, string> = {
  pink:
    "Color palette: soft pastel tones — blush pink, powder pink, cream white, soft rose-gold accents. " +
    "Bright, airy, soft-focus lighting throughout the scene.",
  beige:
    "Color palette: warm earth tones — beige, camel, taupe, warm sand, muted terracotta accents. " +
    "Warm, grounded, natural sunlight throughout the scene.",
};

const MOOD_FRAGMENTS: Record<Mood, string> = {
  // 설렘 (EXCITEMENT): 고명도·비비드·화사함
  sul:
    "Mood: EXCITEMENT — high-key exposure, vivid and radiant color pops, sparkling highlights, " +
    "joyful and exhilarating energy, a sense of anticipation.",
  // 여유 (RELAXATION): 중명도 내추럴·코지
  calm:
    "Mood: RELAXATION — mid-tone natural exposure, soft diffused light, unhurried cozy atmosphere, " +
    "comfortable tactile textures, gentle warm shadows.",
  // 자신감 (CONFIDENCE): 저명도 모노톤·미니멀 시크
  confidence:
    "Mood: CONFIDENCE — low-key exposure, restrained near-monochrome palette, deep sculpted shadows, " +
    "sharp minimalist architectural lines, powerful and self-assured atmosphere.",
};

const JOURNEY_FRAGMENTS: Record<Journey, string> = {
  city:
    "Setting: exploring the city — sophisticated urban streetscape, modern architecture, " +
    "a boulevard-level perspective through an upscale metropolitan district.",
  shop:
    "Setting: shopping and culture — an upscale shopping district or cultural space, " +
    "boutique storefronts, a gallery-like plaza, curated art-space ambience.",
  relax:
    "Setting: relaxing leisure time — a tranquil resort terrace, poolside or garden lounge, " +
    "open-air leisure space with an unhurried resort ambience.",
};

export function getFileName(colorway: Colorway, mood: Mood, journey: Journey): string {
  return `${colorway}_${mood}_${journey}2.png`;
}

export function getRelativePath(colorway: Colorway, mood: Mood, journey: Journey): string {
  return `${colorway}/${getFileName(colorway, mood, journey)}`;
}

export function buildPrompt(colorway: Colorway, mood: Mood, journey: Journey): string {
  return [
    BASE_PROMPT,
    COLORWAY_FRAGMENTS[colorway],
    MOOD_FRAGMENTS[mood],
    JOURNEY_FRAGMENTS[journey],
  ].join(" ");
}

export function getAllCombinations(): WorldCombination[] {
  const combinations: WorldCombination[] = [];
  for (const colorway of COLORWAYS) {
    for (const mood of MOODS) {
      for (const journey of JOURNEYS) {
        combinations.push({
          colorway,
          mood,
          journey,
          fileName: getFileName(colorway, mood, journey),
          relativePath: getRelativePath(colorway, mood, journey),
          prompt: buildPrompt(colorway, mood, journey),
        });
      }
    }
  }
  return combinations;
}

// `npm run list-combinations` 로 실행하면 API 키 없이도 18조합의 파일명/프롬프트를
// 콘솔에서 바로 검증할 수 있다.
function isMainModule(): boolean {
  const entry = process.argv[1];
  return Boolean(entry) && import.meta.url === `file://${entry}`;
}

if (isMainModule()) {
  const combinations = getAllCombinations();
  console.log(`총 ${combinations.length}개 조합 (기대값: 18)\n`);
  for (const combo of combinations) {
    console.log(`- ${combo.relativePath}`);
    console.log(`  ${combo.prompt}\n`);
  }
  if (combinations.length !== 18) {
    console.error(`경고: 조합 개수가 18이 아닙니다 (${combinations.length})`);
    process.exitCode = 1;
  }
}
