# 📦 402 Frontend Monorepo

This repository is a high-performance monorepo powered by `pnpm` workspaces and Turborepo. We use a team-based directory structure to organize our frontend applications.

Prerequisites:

- `nodejs` -> v24.12 or higher. This may work with something lower but its not been tested
- `pnpm` -> `corepack enable pnpm`

## Getting Started

1. `pnpm install`
2. Start an app in dev mode: `` // TODO

## Create New Project

1. `pnpm gen:package`

## Running scripts

- Use `--filter` to scope `pnpm` to your package.
- Lint: `pnpm <cmd> --filter @402systems/app-core-design`

## Linting

- `pnpm lint` to lint the entire repo. Use `--filter <pkg>` to scope down
- `pnpm lint:fix` to lint and autofix the entire repo. Use `--filter <pkg>` to scope down

## Formatting

- `pnpm format:check`
- `pnpm format:fix`

## Deploy

Todo
