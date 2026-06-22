import { existsSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, basename, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const musicDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "music",
);

const sourceDir = resolve(musicDir, "source");


const flacs = readdirSync(sourceDir).filter(
  (f) => extname(f).toLowerCase() === ".flac",
);

if (!flacs.length) {
  console.log("No FLAC files found in music/source/");
  process.exit(0);
}

for (const file of flacs) {
  const input = resolve(sourceDir, file);
  const output = resolve(musicDir, basename(file, extname(file)) + ".m4a");

  if (existsSync(output)) {
    console.log(`skip (exists): ${basename(output)}`);
    continue;
  }

  console.log(`converting: ${file}`);
  execSync(`ffmpeg -i "${input}" -c:a aac -b:a 192k -vn "${output}"`, {
    stdio: "inherit",
  });
  console.log(`done: ${basename(output)}`);
}
