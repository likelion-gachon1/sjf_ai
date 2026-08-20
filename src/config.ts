/**
 * 전역 설정. 모델명/이미지 규격/딜레이 등을 한 곳에서 바꿀 수 있도록 상수로 관리한다.
 */

// OpenAI 이미지 생성 모델. 필요 시 이 값만 바꾸면 전체 파이프라인에 반영된다.
export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";

// World 배경은 가로형 16:9에 가까운 규격을 쓴다 (기준 1672x941 / 1792x1024).
// gpt-image-1이 지원하는 사이즈 중 가장 가까운 가로형 값을 사용한다.
export const IMAGE_SIZE = "1536x1024" as const;

export const OUTPUT_DIR = "output";

// 조합 사이 호출 간격(ms). Rate limit 방지용.
export const REQUEST_DELAY_MS = Number(process.env.GENERATE_DELAY_MS ?? 2000);

// 기본 프론트 배경 이미지 경로 (필요 시 --target 인자로 덮어쓸 수 있음).
export const DEFAULT_FRONTEND_WORLDS_DIR = "../frontend/public/worlds";
