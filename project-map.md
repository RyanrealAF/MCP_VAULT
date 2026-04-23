ChatGPT Codex MCP Builder Architecture

1. The Schematic Definition (The Blueprint)
File: mcp-schema.json
Role: Provides ChatGPT Codex with the strict structural requirements for MCP servers (L1/L2 protocol specs). ChatGPT Codex uses this to ensure generated code is compliant before it ever leaves the VM.

2. The Tool-Smiting Agent (The Builder)
File: forge.ts
Role: A specialized script that ChatGPT Codex invokes to:
- Scaffold a new MCP project.
- Inject the wrangler.toml with your Cloudflare IDs.
- Run npm install and wrangler deploy automatically.

3. The Validation Loop
Process:
- ChatGPT Codex generates code based on your intent.
- forge.ts runs a local dry-run test.
- If tests pass, GitHub Action is triggered via ALL_ACCESS key.
- MCP server goes live on buildwhilebleeding.com.
