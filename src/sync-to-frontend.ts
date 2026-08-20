/**
 * 검수를 통과한 output/ 이미지를 프론트 저장소의 public/worlds/ 로 복사한다.
 *
 * 이동/삭제는 하지 않는다 — output/ 은 그대로 두고 복사만 한다.
 * 검수를 통과하지 않은 파일까지 실수로 옮기는 걸 막기 위해, 18개 정식 조합
 * 파일명에 해당하는 것만 복사 대상으로 삼는다.
 *
 * 사용 예:
 *   npm run sync -- --dry-run                 # 무엇이 복사될지만 확인
 *   npm run sync                               # 실제 복사
 *   npm run sync -- --target ../frontend/public/worlds
 */

import { existsSync } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { OUTPUT_DIR, DEFAULT_FRONTEND_WORLDS_DIR } from "./config.js";
import { getAllCombinations } from "./prompts.js";
import { getBoolArg, getStringArg, parseArgs } from "./args.js";

interface SyncPlanEntry {
  source: string;
  destination: string;
  relativePath: string;
}

function buildPlan(targetDir: string): { plan: SyncPlanEntry[]; missing: string[] } {
  const plan: SyncPlanEntry[] = [];
  const missing: string[] = [];

  for (const combo of getAllCombinations()) {
    const source = path.join(OUTPUT_DIR, combo.relativePath);
    if (!existsSync(source)) {
      missing.push(combo.relativePath);
      continue;
    }
    plan.push({
      source,
      destination: path.join(targetDir, combo.relativePath),
      relativePath: combo.relativePath,
    });
  }

  return { plan, missing };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = getBoolArg(args, "dry-run");
  const targetDir = getStringArg(args, "target") ?? DEFAULT_FRONTEND_WORLDS_DIR;

  const { plan, missing } = buildPlan(targetDir);

  console.log(`대상 디렉터리: ${targetDir}`);
  console.log(`복사 대상: ${plan.length}개 (output/에 없는 조합: ${missing.length}개)\n`);

  if (missing.length > 0) {
    console.log("output/ 에 아직 없는 조합 (건너뜀):");
    for (const m of missing) console.log(`  - ${m}`);
    console.log("");
  }

  if (dryRun) {
    console.log("[dry-run] 아래 파일들이 복사될 예정입니다:");
    for (const entry of plan) {
      console.log(`  ${entry.source} -> ${entry.destination}`);
    }
    return;
  }

  let copied = 0;
  for (const entry of plan) {
    await mkdir(path.dirname(entry.destination), { recursive: true });
    await copyFile(entry.source, entry.destination);
    console.log(`복사됨: ${entry.source} -> ${entry.destination}`);
    copied++;
  }

  console.log(`\n===== 요약 =====`);
  console.log(`복사 완료: ${copied}개`);
}

main().catch((error) => {
  console.error("예상치 못한 오류:", error);
  process.exit(1);
});
