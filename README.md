# bank-launch

CLI for BANK token launch operations on Solana.

## Prerequisites

- [Bun](https://bun.sh) - Fast JavaScript runtime (v1.3.6+)
- [Surfpool](https://github.com/txtx/surfpool) - Local Solana validator for development

## Installation

```bash
bun install
```

## CLI Usage

### Initialize keypairs

Generate deployer keypairs for deployment:

```bash
./bank init
```

Options:

- `-f, --force` - Forcefully overwrite existing keypairs
- `-o, --output-dir <dir>` - Output directory (default: `./secrets`)

### Launch token

Launch the BANK token on Solana:

```bash
./bank launch
```

Options:

- `-c, --cluster <cluster>` - Cluster to connect to: `local`, `devnet`, `mainnet` (default: `devnet`)
- `-s, --send` - Actually send the transactions (dry-run by default)
- `--seed <seed>` - Seed for mint derivation (default: `bank-launch`)

## Scripts

| Script            | Command                   | Description                           |
| ----------------- | ------------------------- | ------------------------------------- |
| `launch:local`    | `bun run launch:local`    | Launch token on local cluster         |
| `lint`            | `bun run lint`            | Run Biome linter                      |
| `lint:fix`        | `bun run lint:fix`        | Run Biome linter with auto-fix        |
| `lint:fix:unsafe` | `bun run lint:fix:unsafe` | Run Biome linter with unsafe auto-fix |
| `type-check`      | `bun run type-check`      | Run TypeScript type checking          |

## Surfpool Commands

Manage the local Surfpool validator:

```bash
./bank surfpool start          # Start validator with TUI (default)
./bank surfpool start --no-tui # Start validator without TUI
./bank surfpool reset          # Reset validator state
./bank surfpool stop           # Stop validator
```

## Local Development

For local development, you need to start Surfpool first:

```bash
./bank surfpool start
```

This starts a local Solana validator connected to devnet and airdrops SOL to all keypairs in `./secrets/`.

Then in another terminal, run the launch:

```bash
./bank launch --cluster local --send
```

You can now run the deposit commands with

```bash
./bank deposit --cluster local user-1 1.5 # user-1 keypair deposits 1.5 SOL
```
