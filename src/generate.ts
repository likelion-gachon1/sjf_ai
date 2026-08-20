/**
 * MCM PORTAL World 배경 18조합을 OpenAI 이미지 생성 API로 배치 생성한다.
 *
 * 실시간 생성이 아니다: 이 스크립트로 뽑은 이미지는 사람이 검수한 뒤
 * sync-to-frontend.ts 로 프론트 저장소에 복사한다.
 *
 * 사용 예:
 *   npm run generate                                   # 18조합 전량
 *   npm run generate -- --colorway pink                # pink만
 *   npm run generate -- --mood calm --journey city      # calm+city 조합만
 *   npm run generate -- --only pink_calm_city2          # 단일 조합
 *   npm run generate -- --force                         # 기존 파일 덮어쓰기
 */

import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import {
  COLORWAYS,
  JOURNEYS,
  MOODS,
  type Colorway,
  type Journey,
  type Mood,
  type WorldCombination,
  getAllCombinations,
} from "./prompts.js";
import { IMAGE_MODEL, IMAGE_SIZE, OUTPUT_DIR, REQUEST_DELAY_MS } from "./config.js";
import { getBoolArg, getStringArg, parseArgs } from "./args.js";

function isColorway(value: string): value is Colorway {
  return (COLORWAYS as readonly string[]).includes(value);
}

function isMood(value: string): value is Mood {
  return (MOODS as readonly string[]).includes(value);
}

function isJourney(value: string): value is Journey {
  return (JOURNEYS as readonly string[]).includes(value);
}

interface Filter {
  colorway?: Colorway;
  mood?: Mood;
  journey?: Journey;
  only?: string;
}

function parseFilter(argv: string[]): Filter {
  const args = parseArgs(argv);
  const filter: Filter = {};

  const colorway = getStringArg(args, "colorway");
  if (colorway !== undefined) {
    if (!isColorway(colorway)) {
      throw new Error(`알 수 없는 --colorway 값: ${colorway} (가능한 값: ${COLORWAYS.join(", ")})`);
    }
    filter.colorway = colorway;
  }

  const mood = getStringArg(args, "mood");
  if (mood !== undefined) {
    if (!isMood(mood)) {
      throw new Error(`알 수 없는 --mood 값: ${mood} (가능한 값: ${MOODS.join(", ")})`);
    }
    filter.mood = mood;
  }

  const journey = getStringArg(args, "journey");
  if (journey !== undefined) {
    if (!isJourney(journey)) {
      throw new Error(`알 수 없는 --journey 값: ${journey} (가능한 값: ${JOURNEYS.join(", ")})`);
    }
    filter.journey = journey;
  }

  const only = getStringArg(args, "only");
  if (only !== undefined) {
    filter.only = only.endsWith(".png") ? only : `${only}.png`;
  }

  return filter;
}

function applyFilter(combinations: WorldCombination[], filter: Filter): WorldCombination[] {
  return combinations.filter((combo) => {
    if (filter.only !== undefined) return combo.fileName === filter.only;
    if (filter.colorway !== undefined && combo.colorway !== filter.colorway) return false;
    if (filter.mood !== undefined && combo.mood !== filter.mood) return false;
    if (filter.journey !== undefined && combo.journey !== filter.journey) return false;
    return true;
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface GenerateResult {
  combo: WorldCombination;
  status: "generated" | "skipped" | "failed";
  error?: string;
}

async function generateOne(client: OpenAI, combo: WorldCombination, force: boolean): Promise<GenerateResult> {
  const outputPath = path.join(OUTPUT_DIR, combo.relativePath);

  if (existsSync(outputPath) && !force) {
    return { combo, status: "skipped" };
  }

  const response = await client.images.generate({
    model: IMAGE_MODEL,
    prompt: combo.prompt,
    size: IMAGE_SIZE,
    n: 1,
  });

  const image = response.data?.[0];
  const b64 = image?.b64_json;
  if (!b64) {
    throw new Error("응답에 b64_json 데이터가 없습니다.");
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(b64, "base64"));

  return { combo, status: "generated" };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const force = getBoolArg(args, "force");
  const filter = parseFilter(process.argv.slice(2));

  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY가 설정되어 있지 않습니다. .env 파일을 확인하세요.");
    process.exit(1);
  }

  const targets = applyFilter(getAllCombinations(), filter);
  if (targets.length === 0) {
    console.error("필터 조건에 해당하는 조합이 없습니다.");
    process.exit(1);
  }

  console.log(`대상 조합: ${targets.length}개 (모델: ${IMAGE_MODEL}, 사이즈: ${IMAGE_SIZE})\n`);

  const client = new OpenAI();
  const results: GenerateResult[] = [];

  for (const [index, combo] of targets.entries()) {
    const label = `[${index + 1}/${targets.length}] ${combo.relativePath}`;
    try {
      const result = await generateOne(client, combo, force);
      results.push(result);
      if (result.status === "skipped") {
        console.log(`${label} -> 건너뜀 (이미 존재, --force로 덮어쓰기 가능)`);
      } else {
        console.log(`${label} -> 생성 완료`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ combo, status: "failed", error: message });
      console.error(`${label} -> 실패: ${message}`);
    }

    const isLast = index === targets.length - 1;
    if (!isLast && REQUEST_DELAY_MS > 0) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  const generated = results.filter((r) => r.status === "generated");
  const skipped = results.filter((r) => r.status === "skipped");
  const failed = results.filter((r) => r.status === "failed");

  console.log("\n===== 요약 =====");
  console.log(`생성: ${generated.length}  건너뜀: ${skipped.length}  실패: ${failed.length}`);
  if (failed.length > 0) {
    console.log("\n실패한 조합:");
    for (const r of failed) {
      console.log(`  - ${r.combo.relativePath}: ${r.error}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("예상치 못한 오류:", error);
  process.exit(1);
});
