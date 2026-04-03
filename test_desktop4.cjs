const { spawn } = require('child_process');
const path = require('path');

const PROJECT_ROOT = "d:\\myapps\\claude-code-haha";
const CLI_ENTRY = path.join(PROJECT_ROOT, "src", "entrypoints", "cli.tsx");
const bunPath = path.join(process.env.USERPROFILE || "", ".bun", "bin", "bun.exe");

// 使用有效的 UUID
const sessionId = "550e8400-e29b-41d4-a716-446655440001";

const bunArgs = [
  "run",
  "--env-file",
  path.join(PROJECT_ROOT, ".env"),
  CLI_ENTRY,
  "-p",
  "--output-format",
  "stream-json",
  "--include-partial-messages",
  "--verbose",
  "--session-id",
  sessionId,
];

console.log("Bun path:", bunPath);
console.log("CWD:", PROJECT_ROOT);
console.log("Session ID:", sessionId);
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
setTimeout(() => {
  console.log("Sending input...");
  child.stdin.write("你好，请介绍一下自己");
  child.stdin.end();
}, 500);

// 直接读取原始输出
let output = "";
child.stdout.on('data', (data) => {
  output += data.toString();
  console.log('[STDOUT]', data.toString().substring(0, 500));
});

child.stderr.on('data', (data) => {
  console.error('[STDERR]', data.toString().substring(0, 500));
});

child.on('error', (err) => {
  console.error('[ERROR]', err);
});

child.on("close", (code) => {
  console.log(`\n\nProcess exited with code ${code}`);
  console.log("\n=== Full output (last 2000 chars) ===");
  console.log(output.slice(-2000));
});
