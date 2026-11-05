import { spawn, spawnSync } from "node:child_process";

const connection = spawnSync("npx", [
  "--yes", "neon@latest", "connection-string", "development",
  "--project-id", "restless-scene-83142333",
  "--database-name", "mandalaria",
  "--role-name", "mandalaria_owner",
], { encoding: "utf8", maxBuffer: 1024 * 1024 });

const databaseUrl = connection.stdout.match(/postgres(?:ql)?:\/\/[^\s"']+/)?.[0];
if (connection.status !== 0 || !databaseUrl) {
  console.error("Não foi possível obter a conexão do Neon. Execute 'npx neon@latest auth'.");
  process.exit(1);
}

const child = spawn("npm", ["run", "dev", "--", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
    NEON_AUTH_BASE_URL: "https://ep-blue-hat-b7uuad7c.neonauth.c-13.us-east-1.aws.neon.tech/mandalaria/auth",
  },
});

child.on("exit", code => process.exit(code ?? 1));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
