ChatGPT Codex MCP Builder Architecture

1. The Schematic Definition (The Blueprint)
File: mcp-schema.json
Role: Provides ChatGPT Codex with strict structural requirements for MCP servers (L1/L2 protocol specs) so generated servers are compliant before leaving the VM.

2. The Tool-Smiting Agent (The Builder)
File: forge.ts
Role: A script ChatGPT Codex invokes to:
- Scaffold `./projects/<name>`.
- Write `index.ts` worker code.
- Generate `wrangler.toml` with Cloudflare account metadata.
- Optionally run `npm install` and `wrangler deploy`.

3. The Validation Loop
Process:
- ChatGPT Codex generates code based on your intent.
- `forge.ts` can run in dry-run mode with `--no-deploy`.
- If checks pass, CI/CD can deploy using GitHub secrets.
- The MCP server goes live on Workers (`*.workers.dev` or your custom route).

CLI Example
```bash
node forge.ts my-mcp-server <cloudflare-account-id> --no-deploy
```
