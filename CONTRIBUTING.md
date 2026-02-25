# Contributing to Joplin Audio Transcriber

Thank you for your interest in contributing to the Joplin Audio Transcriber plugin! We welcome contributions of all kinds, including bug reports, feature requests, documentation improvements, and code changes.

## Getting Started

See the [Development section in the README](README.md#development) for detailed setup instructions, including:

- Prerequisites (Node.js, npm, Joplin Desktop)
- Building and installing the plugin
- Running linting and tests

## Coding Standards

All code must pass linting before being committed:

```bash
npm run lint
```

This runs ESLint and Prettier to enforce consistent style. For detailed coding standards, TypeScript guidelines, and project architecture, see the [project wiki](https://github.com/JordanVoets/joplin-audio-transcriber/wiki).

## Git Conventions

This project follows specific conventions for commit messages and branch names. For detailed guidelines, see the [Git Conventions](https://github.com/JordanVoets/joplin-audio-transcriber/wiki/Git-Conventions) page in the wiki.

**Quick reference:**

- **Commit messages**: `<type>: Capitalized description` (types: `feat`, `bug`, `docs`, `style`, `refactor`, `test`, `chore`)
- **Branch names**: `<type>/<short-description>` using lowercase with hyphens

## Testing

Run tests before submitting a pull request:

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
```

For detailed testing guidelines, see the [Testing Guide](https://github.com/JordanVoets/joplin-audio-transcriber/wiki/Testing-Guide) in the wiki.

## Pull Request Process

Before opening a pull request:

1. Create a branch following [git conventions](https://github.com/JordanVoets/joplin-audio-transcriber/wiki/Git-Conventions)
2. Write or update tests for your changes
3. Run `npm test` and `npm run lint` - both must pass
4. Build and test the plugin: `npm run dist`
5. Rebase onto the latest `main`: `git rebase origin/main`

When opening a PR:

- Reference related issues (e.g., `Closes #123`)
- Summarize key changes and any risks
- Include screenshots if relevant
- Keep changes focused - prefer smaller, reviewable PRs
- Respond to review feedback promptly

## Reporting Issues

### Bug Reports

When reporting a bug, please include:

- **Description** - Clear description of the issue
- **Steps to reproduce** - Detailed steps to reproduce the behavior
- **Expected behavior** - What you expected to happen
- **Actual behavior** - What actually happened
- **Environment**:
  - Joplin version
  - Plugin version
  - Operating system
  - Transcription provider (OpenAI, Gemini, etc.)
- **Logs or screenshots** - If applicable

## Extending the Plugin

For detailed guides on extending the plugin, see the wiki:

- [Adding New API Integrations](https://github.com/JordanVoets/joplin-audio-transcriber/wiki/Adding-New-Api-Integrations) - Learn the Connector/Request pattern
- [Adding a New Transcription Service](https://github.com/JordanVoets/joplin-audio-transcriber/wiki/Adding-New-Services) - Step-by-step service integration guide

## Questions?

If you have questions or need help getting started:

- Check the [wiki documentation](https://github.com/JordanVoets/joplin-audio-transcriber/wiki)
- Open a [discussion](https://github.com/JordanVoets/joplin-audio-transcriber/discussions)
- Open an [issue](https://github.com/JordanVoets/joplin-audio-transcriber/issues) if you think you've found a bug

## License

By contributing to this project, you agree that your contributions will be licensed under the [MIT License](LICENSE).

Thank you for contributing! 🎉
