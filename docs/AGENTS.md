# AGENTS.md

This file provides instructions for Codex when working with files under `docs/`.

## Writing guidelines

- Write user-facing Korean documentation in polite Korean.
- Avoid exaggerated marketing language. Prefer concrete, verifiable descriptions of behavior, value, and limitations.
- Keep UX explanations practical: describe what the user sees, what action they can take, and what happens next.
- When documenting commands or code blocks, make sure they are realistic for this repository and include required context such as the working directory, environment variables, or prerequisites when needed.

## Review guidelines

- Treat UX regressions or misleading UX documentation as P1 issues. This includes unclear flows, confusing labels, missing user states, or documentation that does not match the actual product behavior.
- Treat security vulnerabilities as P1 issues. Pay particular attention to authentication, authorization, session handling, PII exposure, dependency or package-install instructions, and unsafe examples.
- Treat commands or code blocks that are not executable as written as P1 issues. Check that command names, package scripts, file paths, environment assumptions, and code syntax are valid for this repository.
- For Korean documentation, treat violations of polite Korean tone or excessive marketing copy as review issues when they reduce clarity, trust, or usability.
- Prefer specific review comments that explain the user impact and the concrete correction needed.
