# MCM PORTAL — 배경생성 (`sjf_ai`)

> 멋사 대학 14기 해커톤 · 가천미인 · Challenge 02 :: 인터랙티브 리테일
> Live ▸ https://mcm-portal.duckdns.org
> Repos ▸ 프론트 sjf_track · 백엔드 sjf_BE · 배경생성 sjf_ai

MCM PORTAL 부스에서 고객을 크로마키로 분리해 그 위에 합성하는 "World 배경" 이미지를,
OpenAI 이미지 생성 API로 **사전에** 만들어 두는 CLI 툴입니다. 프론트가 읽는 18개 배경
조합(`colorway × mood × journey`)을 배치로 생성하고, 사람이 검수한 뒤 프론트 저장소로
복사하는 것까지가 이 레포의 역할입니다.

> **이 레포에는 프론트/백 소스코드가 없습니다.** 배경 이미지를 뽑아내는 도구만 담습니다.
> 실시간 이미지 생성 서버도 아닙니다.

## 설계 의도: 배치 생성 + 브랜드 검수, 실시간 생성 아님

World 배경은 고객 응대 중에 즉석으로 생성되는 것이 아닙니다. 이 CLI로 18개 조합을 미리 배치
생성하고, 사람이 각 이미지를 검수해 럭셔리 브랜드 톤에 맞고 인물/텍스트/손 등이 깨지지 않은
것만 골라낸 뒤, `sync-to-frontend.ts` 로 프론트 저장소에 복사합니다. 실시간 합성 대상은 고객
자신뿐이고, 배경은 항상 검수를 통과한 고정 이미지입니다.

이 구조를 택한 이유는 두 가지입니다. 하나는 **품질** — 이미지 생성 모델은 손·얼굴·글자를
자주 뭉개고, 럭셔리 브랜드 화면에서는 그런 실패가 그대로 티가 납니다. 사람 검수를 한 번 거쳐야
안심하고 부스에 걸 수 있습니다. 다른 하나는 **응답 속도·안정성** — 고객 응대 중에 이미지 생성
API를 호출하면 지연·요금·실패 위험을 그대로 고객이 떠안습니다. 배경을 미리 확정해 두면 부스
프론트는 정적 파일만 읽으면 됩니다.

## 파이프라인

```
   [generate]                    [사람 검수]                  [sync-to-frontend]
 OpenAI 이미지 API로     ─▶   output/ 의 각 이미지를    ─▶   통과분을 프론트 저장소
 18조합 배치 생성             톤·왜곡·조합 일치 확인          public/worlds/ 로 복사
      │                              │                              │
   output/{색}/                  통과한 것만                 ../frontend/public/worlds/
   {색}_{무드}_{여정}2.png        다음 단계로                 {색}/{색}_{무드}_{여정}2.png
```

`generate` 는 `output/` 에만 쓰고, `sync` 는 `output/` 을 **복사만** 합니다(이동·삭제 없음).
검수를 통과하지 않은 파일이 실수로 넘어가는 것을 막기 위해, `sync` 는 18개 정식 조합 파일명에
해당하는 것만 복사 대상으로 삼습니다.

## 셋업

```bash
npm install
cp .env.example .env
```

`.env` 에 OpenAI API 키를 채웁니다.

```
OPENAI_API_KEY=sk-...
```

## 파일명 규약 (프론트가 그대로 읽는다 — 변경 금지)

프론트는 아래 경로 규약으로 배경을 불러옵니다. 파일명 토큰이 프론트의 배경 경로 규약
(`comboBackgroundImage()`)과 1:1로 일치해야 하므로, 이 규약은 두 레포의 공통 계약입니다.

```
/worlds/{colorway}/{colorway}_{mood}_{journey}2.png
예) pink_calm_city2.png · beige_confidence_shop2.png
```

| 축 | 값 | 의미 |
| --- | --- | --- |
| colorway | `pink` | 밝고 소프트한 파스텔 톤 |
| colorway | `beige` | 웜톤·차분한 어스톤 |
| mood | `sul` | 설렘 (EXCITEMENT) — 고명도·비비드·화사함 |
| mood | `calm` | 여유 (RELAXATION) — 중명도 내추럴·코지 |
| mood | `confidence` | 자신감 (CONFIDENCE) — 저명도 모노톤·미니멀 시크 |
| journey | `city` | 도시 곳곳 둘러보기 — 도시 거리·건축 |
| journey | `shop` | 쇼핑·문화 즐기기 — 쇼핑가·문화공간·갤러리 무드 |
| journey | `relax` | 여유롭게 쉬기 — 휴양·테라스·여유로운 야외 |

파일명 끝의 `2` 는 버전 접미사이며 그대로 유지합니다. 총 2 × 3 × 3 = **18개** 조합.
이미지 규격은 가로형(`1536x1024`, `IMAGE_SIZE`), 인물 없음입니다.

## 프롬프트 구성 방식

프롬프트는 `src/prompts.ts` 에서 **공통 베이스 + 축별 조각 3개**를 이어 붙여 조립합니다.
색·무드·여정을 각각 독립된 조각으로 관리하므로, 한 축의 표현만 바꾸면 그 축이 들어간 조합
전체에 반영됩니다.

```
buildPrompt = BASE_PROMPT
            + COLORWAY_FRAGMENTS[colorway]   // 제품 컬러 팔레트·조명
            + MOOD_FRAGMENTS[mood]            // 명도·채도·분위기
            + JOURNEY_FRAGMENTS[journey]      // 장소 성격
```

| 조각 | 담는 내용 | 예 |
| --- | --- | --- |
| `BASE_PROMPT` | MCM 브랜드 DNA·화보 톤 + 배제 규칙 | editorial high-fashion 톤, 인물·손·얼굴·텍스트·로고 전면 배제, 크로마키 합성용 빈 중경 |
| `COLORWAY_FRAGMENTS` | 제품 컬러에 맞춘 팔레트·조명 | `pink` = blush·powder pink·cream, 밝고 airy / `beige` = camel·taupe·sand, 웜한 자연광 |
| `MOOD_FRAGMENTS` | 무드별 명도·채도·분위기 | `sul` = high-key·vivid / `calm` = mid-tone·diffused / `confidence` = low-key·near-monochrome |
| `JOURNEY_FRAGMENTS` | 장소 성격 | `city` = 도시 거리 / `shop` = 쇼핑·갤러리 / `relax` = 리조트 테라스 |

**인물·손·얼굴·텍스트를 프롬프트에서 명시적으로 배제하는 이유**가 코드 주석에 남아 있습니다.
① 인물은 매장에서 크로마키로 실시간 합성되므로 배경에 사람이 이미 있으면 안 되고, ② 손·얼굴·
텍스트는 이미지 생성 모델이 가장 자주 뭉개는 지점이라 럭셔리 톤을 해치는 실패로 직결되기
때문입니다. 베이스 프롬프트는 또한 "실제 사람이 실시간 합성될 자리"라는 점을 명시해 중경을
비워 두도록 유도합니다.

## 실행

| 명령 | 하는 일 |
| --- | --- |
| `npm run generate` | 18조합 전량 생성 |
| `npm run generate -- --colorway pink` | 특정 축만 필터링(예: pink) |
| `npm run generate -- --mood calm --journey city` | 여러 축 조합 필터 |
| `npm run generate -- --only pink_calm_city2` | 단일 조합만 |
| `npm run generate -- --force` | 이미 있는 파일도 덮어쓰기(기본은 건너뜀 — 비용 절약) |
| `npm run list-combinations` | 18조합 파일명·프롬프트를 API 키 없이 콘솔에서 검증 |
| `npm run sync -- --dry-run` | 무엇이 복사될지만 미리 확인 |
| `npm run sync` | 검수 통과분을 프론트 저장소로 실제 복사 |
| `npm run sync -- --target <dir>` | 복사 대상 디렉터리 지정(기본 `../frontend/public/worlds`) |

`generate` 는 일부 조합이 API 오류로 실패해도 나머지를 계속 진행하고, 마지막에 성공/건너뜀/실패
개수와 실패 목록을 출력합니다(실패가 있으면 종료 코드 1). 조합 사이에는 rate limit 방지용 딜레이
(`GENERATE_DELAY_MS`, 기본 2000ms)를 둡니다. 기존 파일은 기본적으로 건너뛰므로, 중단됐다가
다시 돌려도 이미 만든 것은 재생성하지 않습니다.

`--only` 로 넘긴 값은 `.png` 가 없으면 자동으로 붙여 파일명과 맞춥니다.

## 검수 기준

`output/` 에 생성된 이미지를 프론트로 옮기기 전에 아래를 확인합니다.

- **인물/손/얼굴 없음** — 크로마키 합성 대상인 실제 고객과 겹치거나 AI 생성 흔적(뭉개진
  손가락, 이상한 얼굴)이 남아 있지 않은지.
- **텍스트/간판 글자 없음** — AI가 만들어낸 깨진 글자나 로고가 없는지.
- **럭셔리 톤** — MCM 브랜드에 맞는 고급스럽고 편집샵 화보 같은 분위기인지, 싸구려 스톡
  이미지처럼 보이지 않는지.
- **colorway/mood/journey 일치** — 의도한 색감·명도·분위기·장소가 맞는지(예: `confidence` 는
  저명도 모노톤이어야 하고 `sul` 은 화사해야 함).
- **크로마키 합성 적합성** — 중경(고객이 서게 될 위치)이 비어 있고 시야를 가리는 전경 요소가
  없는지, 원근이 자연스러운지.

## 설정 노브

| 노브 | 위치 | 기본값 | 용도 |
| --- | --- | --- | --- |
| `IMAGE_MODEL` | `src/config.ts` (`OPENAI_IMAGE_MODEL` 로도) | `gpt-image-1` | 이미지 생성 모델 |
| `IMAGE_SIZE` | `src/config.ts` | `1536x1024` | 생성 이미지 규격(가로형 16:9 근사) |
| `REQUEST_DELAY_MS` | `.env` `GENERATE_DELAY_MS` | `2000` | 조합 사이 호출 간격(rate limit 방지) |
| `OUTPUT_DIR` | `src/config.ts` | `output` | 생성 결과 저장 폴더 |
| `DEFAULT_FRONTEND_WORLDS_DIR` | `src/config.ts` | `../frontend/public/worlds` | `sync` 기본 복사 대상 |

## 검증

```bash
npx tsc --noEmit            # 타입 체크
npm run list-combinations   # 18조합 파일명·프롬프트 콘솔 확인 (API 키 불필요)
npm run sync -- --dry-run   # 복사 대상 미리보기 (API 키 불필요)
```

`list-combinations` 는 조합 개수가 18이 아니면 경고와 함께 종료 코드 1을 냅니다. API 키 없이도
파일명 규약과 프롬프트를 먼저 검증할 수 있어, 실제 생성 전 규약 어긋남을 잡아냅니다.
