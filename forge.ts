import { execSync } from "child_process";
import { writeFile, mkdir } from "fs/promises";

/**
 * ARCHITECTURAL RULE:
 * ChatGPT Codex calls this script to "forge" a new MCP server.
 * It handles the $0 budget deployment to Cloudflare.
 */

interface ForgeConfig {
  name: string;
  code: string;
  cfAccountId: string;
}

export async function forgeMcpServer(config: ForgeConfig) {
  const projectDir = `./projects/${config.name}`;
  
  // 1. Create Project Structure
  await mkdir(projectDir, { recursive: true });

  // 2. Inject Code
  await writeFile(`${projectDir}/index.ts`, config.code);

  // 3. Inject Wrangler Config
  const wrangler = `
name = "${config.name}"
main = "index.ts"
compatibility_date = "2024-01-01"
workers_dev = true
[vars]
ACCOUNT_ID = "${config.cfAccountId}"
  `.trim();
  
  await writeFile(`${projectDir}/wrangler.toml`, wrangler);

  // 4. Trigger Deployment
  try {
    console.log(`Deploying ${config.name} to Cloudflare...`);
    execSync(`cd ${projectDir} && npx wrangler deploy`, { stdio: 'inherit' });
    return { status: "success", url: `https://${config.name}.workers.dev` };
  } catch (e: any) {
    return { status: "error", message: e.message };
  }
}
