const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

const PROJECT_ROOT = "d:\\myapps\\claude-code-haha";
const CLI_ENTRY = path.join(PROJECT_ROOT, "src", "entrypoints", "cli.tsx");
const bunPath = path.join(process.env.USERPROFILE || "", ".bun", "bin", "bun.exe");

const bunArgs = [
  "run",
  "--config",
  path.join(PROJECT_ROOT, "bunfig.toml"),
  "--env-file",
  path.join(PROJECT_ROOT, ".env"),
  CLI_ENTRY,
  "-p",
  "--output-format",
  "stream-json",
  "--include-partial-messages",
  "--verbose",
  "--session-id",
  "test-session-123",
];

console.log("Bun path:", bunPath);
console.log("Args:", bunArgs);
console.log("CWD:", PROJECT_ROOT);
console.log("\nStarting...\n");

const child = spawn(bunPath, bunArgs, {
  cwd: PROJECT_ROOT,
  windowsHide: true,
  stdio: ["pipe", "pipe", "pipe"],
  env: {
    ...process.env,
    CLAUDE_CODE_LOCAL_VERSION: '999.0.0-local',
    CLAUDE_CODE_LOCAL_PACKAGE_URL: 'claude-code-local',
    CLAUDE_CODE_LOCAL_BUILD_TIME: new Date().toISOString(),
    CLAUDE_CODE_LOCAL_SKIP_REMOTE_PREFETCH: '1',
  },
});

// 发送测试消息
child.stdin.write("你好");
child.stdin.end();

const rl = readline.createInterface({ input: child.stdout });
let textDeltaCount = 0;
let assistantCount = 0;
let resultCount = 0;

rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    console.log("[NON-JSON]", trimmed.substring(0, 100));
    return;
  }

  if (parsed?.type === "stream_event") {
    if (parsed?.event?.type === "content_block_delta") {
      if (parsed?.event?.delta?.type === "text_delta") {
        textDeltaCount++;
        console.log(`[TEXT_DELTA #${textDeltaCount}]`, parsed.event.delta.text);
      } else if (parsed?.event?.delta?.type === "thinking_delta") {
        console.log("[THINKING_DELTA]", parsed.event.delta.thinking?.substring(0, 50));
      }
    }
  } else if (parsed?.type === "assistant") {
    assistantCount++;
    console.log(`\n[ASSISTANT #${assistantCount}]`, JSON.stringify(parsed.message?.content?.map(c => ({type: c.type, text: c.text?.substring(0, 50)})), null, 2));
  } else if (parsed?.type === "result") {
    resultCount++;
    console.log(`\n[RESULT #${resultCount}]`, parsed.result?.substring(0, 200));
  } else {
    console.log(`[${parsed?.type}]`, JSON.stringify(parsed).substring(0, 100));
  }
});

child.stderr.on("data", (chunk) => {
  console.error("[STDERR]", chunk.toString().substring(0, 200));
});

child.on("close", (code) => {
  console.log(`\n\nProcess exited with code ${code}`);
  console.log(`Stats: ${textDeltaCount} text deltas, ${assistantCount} assistants, ${resultCount} results`);
});
