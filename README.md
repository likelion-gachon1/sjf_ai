# sjf_ai — MCM PORTAL World 배경 이미지 생성 툴

MCM PORTAL은 매장 부스에서 고객을 크로마키로 분리해 "World 배경" 위에
실시간으로 합성하는 리테일 체험이다. 이 레포는 그 배경 이미지를
OpenAI 이미지 생성 API로 **사전에** 만들어내는 CLI 툴이다.

> **이 레포에는 프론트/백 소스코드가 없다.** 오직 배경 이미지를 뽑아내는
> 도구만 담는다. 실시간 이미지 생성 서버도 아니다.

## 설계 의도: 배치 생성 + 브랜드 검수, 실시간 생성 아님

World 배경은 고객 응대 중에 즉석으로 생성되는 것이 아니다. 이 CLI로
18개 조합을 미리 배치 생성하고, 사람이 각 이미지를 검수해서 럭셔리
브랜드 톤에 맞고 인물/텍스트/손 등이 깨지지 않은 것만 골라낸 뒤,
`sync-to-frontend.ts`로 프론트 저장소에 복사한다. 실시간 합성 대상은
고객 자신뿐이고, 배경은 항상 검수를 통과한 고정 이미지다.

## 셋업

```bash
npm install
cp .env.example .env
```

`.env`에 OpenAI API 키를 채운다.

```
OPENAI_API_KEY=sk-...
```

## 파일명 규약 (프론트가 그대로 읽는다 — 변경 금지)

프론트는 아래 경로로 배경을 불러온다:

```
/worlds/{colorway}/{colorway}_{mood}_{journey}2.png
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

파일명 끝의 `2`는 버전 접미사이며 그대로 유지한다. 총 2 × 3 × 3 =
**18개** 조합. 예: `pink_calm_city2.png`, `beige_confidence_shop2.png`.

이미지 규격: 가로형 약 16:9 (기준 1672×941 / 1792×1024), PNG, 인물 없음.

## 실행

```bash
# 18조합 전량 생성
npm run generate

# 특정 축만 필터링해서 생성
npm run generate -- --colorway pink
npm run generate -- --mood calm --journey city
npm run generate -- --only pink_calm_city2

# 이미 있는 파일도 덮어쓰기 (기본은 건너뜀 — 비용 절약)
npm run generate -- --force

# 18조합 파일명/프롬프트를 API 키 없이 콘솔에서 검증
npm run list-combinations

# 검수 통과 이미지를 프론트 저장소로 복사 (기본 대상: ../frontend/public/worlds)
npm run sync -- --dry-run     # 무엇이 복사될지만 미리 확인
npm run sync                  # 실제 복사
npm run sync -- --target ../frontend/public/worlds
```

생성 중 일부 조합이 API 오류로 실패해도 나머지는 계속 진행되며, 마지막에
성공/건너뜀/실패 개수와 실패 목록을 출력한다. 조합 사이에는 rate limit
방지를 위한 딜레이(`GENERATE_DELAY_MS`, 기본 2000ms)를 둔다.

`sync-to-frontend.ts`는 `output/`의 파일을 **복사만** 하며 이동·삭제하지
않는다. 어떤 파일이 어디로 복사됐는지 전부 로그로 남긴다.

## 검수 기준

`output/`에 생성된 이미지를 프론트로 옮기기 전에 아래를 확인한다:

- **인물/손/얼굴 없음** — 크로마키 합성 대상인 실제 고객과 겹치거나
  AI 생성 흔적(뭉개진 손가락, 이상한 얼굴)이 남아있지 않은지.
- **텍스트/간판 글자 없음** — AI가 만들어낸 깨진 글자나 로고가 없는지.
- **럭셔리 톤** — MCM 브랜드에 맞는 고급스럽고 편집샵 화보 같은 분위기인지,
  싸구려 스톡 이미지처럼 보이지 않는지.
- **colorway/mood/journey 일치** — 의도한 색감·명도·분위기·장소가 맞는지
  (예: `confidence`는 저명도 모노톤이어야 하고 `sul`은 화사해야 함).
- **크로마키 합성 적합성** — 중경(고객이 서게 될 위치)이 비어 있고 시야를
  가리는 전경 요소가 없는지, 원근이 자연스러운지.

## 설정 변경

- 모델명: `src/config.ts`의 `IMAGE_MODEL` (기본 `gpt-image-1`, `.env`의
  `OPENAI_IMAGE_MODEL`로도 덮어쓸 수 있음)
- 이미지 사이즈: `src/config.ts`의 `IMAGE_SIZE`
- 생성 간 딜레이: `.env`의 `GENERATE_DELAY_MS`
- 프론트 기본 복사 대상: `src/config.ts`의 `DEFAULT_FRONTEND_WORLDS_DIR`

## 검증

```bash
npx tsc --noEmit        # 타입 체크
npm run list-combinations   # 18조합 파일명/프롬프트 콘솔 확인 (API 키 불필요)
npm run sync -- --dry-run   # 복사 대상 미리보기 (API 키 불필요)
```
