
import { mkdir, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// --- Templates ---

const wranglerTomlTemplate = (name: string) => `
name = "${name}"
main = "index.ts"
compatibility_date = "2024-01-01"
workers_dev = true

[observability]
enabled = true
`;

const indexTsTemplate = `
export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    return new Response('Hello World from my new MCP Worker!');
  },
};
`;

// --- Main Logic ---

async function forgeProject(projectName: string, deploy: boolean) {
  if (!projectName || !/^[a-zA-Z0-9-]+$/.test(projectName)) {
    throw new Error('Invalid project name. Use alphanumeric characters and hyphens only.');
  }

  const projectPath = resolve(process.cwd(), 'projects', projectName);
  console.log(`🚀 Scaffolding project in: ${projectPath}`);

  try {
    // 1. Create project directory and files
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'wrangler.toml'), wranglerTomlTemplate(projectName));
    await writeFile(join(projectPath, 'index.ts'), indexTsTemplate);

    console.log(`✅ Project "${projectName}" scaffolded successfully.`);

    // 2. Deploy if requested
    if (deploy) {
      console.log(`🚀 Deploying "${projectName}" to Cloudflare...`);
      // We execute 'npx wrangler deploy' from within the newly created project directory
      const { stdout, stderr } = await execAsync('npx wrangler deploy', { cwd: projectPath });
      
      if (stderr) {
        console.error('⚠️ Deployment failed with errors:', stderr);
        throw new Error(`Deployment failed: ${stderr}`);
      }
      console.log('✅ Deployment successful!');
      console.log(stdout);
      return stdout;
    } else {
      console.log('✅ Dry-run complete. To deploy, run without the --no-deploy flag.');
      return 'Dry-run complete. Project scaffolded.';
    }
  } catch (error) {
    console.error(`❌ An error occurred during the forge process:`, error);
    throw error;
  }
}

// --- CLI Entry Point ---

if (require.main === module) {
  const args = process.argv.slice(2);
  const projectName = args[0];
  const noDeploy = args.includes('--no-deploy');

  if (!projectName) {
    console.error('Usage: node forge.ts <project-name> [--no-deploy]');
    process.exit(1);
  }

  forgeProject(projectName, !noDeploy).catch(() => process.exit(1));
}

export { forgeProject };
