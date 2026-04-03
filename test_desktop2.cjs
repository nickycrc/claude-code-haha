const { spawn } = require('child_process');
const path = require('path');

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
  "test-session-456",
];

console.log("Bun path:", bunPath);
console.log("Args:", bunArgs);
console.log("CWD:", PROJECT_ROOT);
console.log("\nStarting...\n");

const child = spawn(bunPath, bunArgs, {
  cwd: PROJECT_ROOT,
  windowsHide: false, // 显示窗口以便调试
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
  child.stdin.write("你好");
  child.stdin.end();
}, 1000);

// 直接读取原始输出
child.stdout.on('data', (data) => {
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
});
