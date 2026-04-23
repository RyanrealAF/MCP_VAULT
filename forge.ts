import { execSync } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import { resolve } from "path";

/**
 * ARCHITECTURAL RULE:
 * ChatGPT Codex calls this script to "forge" a new MCP server.
 * It handles project scaffolding and optional deployment to Cloudflare.
 */

interface ForgeConfig {
  name: string;
  code: string;
  cfAccountId: string;
  installDependencies?: boolean;
  deploy?: boolean;
}

interface ForgeResult {
  status: "success" | "error";
  message?: string;
  url?: string;
  projectDir?: string;
}

const sanitizeName = (value: string): string => {
  const trimmed = value.trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    throw new Error("Invalid project name. Use lowercase letters, numbers, and hyphens only.");
  }
  return trimmed;
};

const run = (command: string, cwd: string): void => {
  execSync(command, { cwd, stdio: "inherit" });
};

export async function forgeMcpServer(config: ForgeConfig): Promise<ForgeResult> {
  try {
    const name = sanitizeName(config.name);
    const projectDir = resolve("./projects", name);
    const indexFile = resolve(projectDir, "index.ts");
    const wranglerFile = resolve(projectDir, "wrangler.toml");
    const packageFile = resolve(projectDir, "package.json");

    // 1. Create Project Structure
    await mkdir(projectDir, { recursive: true });

    // 2. Inject Worker Code
    await writeFile(indexFile, config.code, "utf-8");

    // 3. Inject Wrangler Config
    const wrangler = [
      `name = "${name}"`,
      'main = "index.ts"',
      'compatibility_date = "2024-01-01"',
      "workers_dev = true",
      "",
      "[vars]",
      `ACCOUNT_ID = "${config.cfAccountId}"`
    ].join("\n");
    await writeFile(wranglerFile, wrangler, "utf-8");

    // 4. Add minimal package.json so npm/wrangler commands are predictable
    const pkg = {
      name,
      private: true,
      version: "0.1.0",
      scripts: {
        deploy: "wrangler deploy"
      },
      devDependencies: {
        wrangler: "^4.13.2"
      }
    };
    await writeFile(packageFile, `${JSON.stringify(pkg, null, 2)}\n`, "utf-8");

    // 5. Optionally install and deploy
    if (config.installDependencies ?? true) {
      run("npm install", projectDir);
    }

    if (config.deploy ?? true) {
      console.log(`Deploying ${name} to Cloudflare...`);
      run("npx wrangler deploy", projectDir);
      return { status: "success", url: `https://${name}.workers.dev`, projectDir };
    }

    return {
      status: "success",
      message: "Project scaffolded successfully (deployment skipped).",
      projectDir
    };
  } catch (error: unknown) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

const parseFlag = (args: string[], flag: string): boolean => args.includes(flag);

if (process.argv[1] && process.argv[1].endsWith("forge.ts")) {
  const [, , name, accountId] = process.argv;

  if (!name || !accountId) {
    console.error("Usage: ts-node forge.ts <project-name> <cloudflare-account-id> [--no-install] [--no-deploy]");
    process.exit(1);
  }

  const starterCode = `
export default {
  async fetch(): Promise<Response> {
    return new Response("MCP Server Active", { status: 200 });
  }
};
`.trimStart();

  forgeMcpServer({
    name,
    code: starterCode,
    cfAccountId: accountId,
    installDependencies: !parseFlag(process.argv, "--no-install"),
    deploy: !parseFlag(process.argv, "--no-deploy")
  }).then((result) => {
    if (result.status === "error") {
      console.error(result.message);
      process.exit(1);
    }

    if (result.url) {
      console.log(`Success: ${result.url}`);
    } else {
      console.log(result.message);
    }
  });
}
