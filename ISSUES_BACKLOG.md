# Repository Issues Backlog

This document tracks proposed improvements and issues for the Joplin Audio Transcriber plugin. These items represent identified opportunities for enhancement across testing, documentation, features, and infrastructure.

---

## 🧪 Testing & Quality Assurance

### Add unit tests for transcription services
**Priority:** High  
**Effort:** Medium  
**Labels:** `testing`, `good-first-issue`

Add comprehensive unit tests for:
- `OpenAITranscriptionService`
- `GeminiTranscriptionService`
- `TranscriptionServiceFactory`
- `ServiceRegistry`

Mock API responses to test success and error scenarios.

---

### Add integration tests
**Priority:** Medium  
**Effort:** High  
**Labels:** `testing`

End-to-end tests covering:
- File selection and validation
- API integration
- Note content updates
- Error handling flows

---

### Set up test infrastructure
**Priority:** High  
**Effort:** Medium  
**Labels:** `testing`, `infrastructure`

Configure testing framework:
- Install Jest or similar
- Add test scripts to `package.json`
- Set up test file structure
- Configure coverage reporting

---

### Add code linting and formatting
**Priority:** High  
**Effort:** Low  
**Labels:** `tooling`, `good-first-issue`

Implement code quality tools:
- ESLint with TypeScript support
- Prettier for consistent formatting
- Add npm scripts: `lint`, `format`
- Configure pre-commit hooks (optional)

---

## 🔄 CI/CD & Automation

### Set up GitHub Actions CI/CD
**Priority:** High  
**Effort:** Medium  
**Labels:** `ci-cd`, `infrastructure`

Automated workflows for:
- Running tests on PR
- Type checking
- Building plugin
- Running linters

---

### Add automated code quality checks
**Priority:** Medium  
**Effort:** Low  
**Labels:** `ci-cd`, `security`

Integrate in CI:
- ESLint checks
- TypeScript compilation
- Dependency vulnerability scanning
- Code coverage reporting

---

### Automate release process
**Priority:** Low  
**Effort:** Medium  
**Labels:** `ci-cd`, `automation`

GitHub Actions workflow for:
- Version bumping
- Changelog generation
- GitHub release creation
- Asset publishing

---

## 📚 Documentation

### Create wiki for "Adding New Services" guide
**Priority:** High  
**Effort:** Low  
**Labels:** `documentation`, `good-first-issue`

The README references `./wiki/Adding-New-Services.md` but the file doesn't exist.

Create comprehensive guide with:
- Step-by-step instructions
- Code examples
- Registration process
- Testing new services

---

### Add CONTRIBUTING.md
**Priority:** High  
**Effort:** Low  
**Labels:** `documentation`, `good-first-issue`

Contributor guidelines covering:
- Code of conduct reference
- Development setup
- How to submit PRs
- Code style guidelines
- Testing requirements

---

### Add CODE_OF_CONDUCT.md
**Priority:** High  
**Effort:** Low  
**Labels:** `documentation`, `good-first-issue`

Adopt standard code of conduct (e.g., Contributor Covenant).

---

### Add SECURITY.md
**Priority:** High  
**Effort:** Low  
**Labels:** `documentation`, `security`, `good-first-issue`

Security policy including:
- Vulnerability reporting process
- Supported versions
- Security best practices for API keys

---

### Add pull request template
**Priority:** Medium  
**Effort:** Low  
**Labels:** `documentation`, `good-first-issue`

✅ **COMPLETED** - Template already created

---

### Add issue templates
**Priority:** Medium  
**Effort:** Low  
**Labels:** `documentation`, `good-first-issue`

✅ **COMPLETED** - Bug report and feature request templates created

---

## 🎨 Features & Enhancements

### Improve progress indication
**Priority:** High  
**Effort:** Medium  
**Labels:** `enhancement`, `ui`

**Current:** `alert()` shows transcription start (line 106 in index.ts has TODO)  
**Proposed:** Proper UI progress indicator showing transcription status

Options:
- Progress dialog with status updates
- Notification system
- Status bar indicator

---

### Add support for batch transcription
**Priority:** Medium  
**Effort:** High  
**Labels:** `enhancement`, `feature`

Transcribe multiple audio files:
- Select multiple file links
- Process in parallel or sequence
- Progress tracking per file
- Aggregate results

---

### Add transcription history/cache
**Priority:** Low  
**Effort:** Medium  
**Labels:** `enhancement`, `feature`

Prevent re-transcribing:
- Cache transcriptions by file hash
- Show cached results instantly
- Option to force re-transcribe
- Cache management (size limits, expiry)

---

### Add more transcription providers
**Priority:** Medium  
**Effort:** Medium  
**Labels:** `enhancement`, `provider`

Support additional services:
- Azure Speech Services
- AssemblyAI
- Deepgram
- AWS Transcribe
- Rev.ai

---

### Add export options
**Priority:** Low  
**Effort:** Medium  
**Labels:** `enhancement`, `feature`

Export transcriptions as:
- WebVTT (`.vtt`)
- SubRip (`.srt`)
- Plain text files
- JSON with metadata

---

### Add timestamp support
**Priority:** Low  
**Effort:** High  
**Labels:** `enhancement`, `feature`

When provider supports it:
- Include word-level timestamps
- Generate time-coded transcriptions
- Format options (SRT style, VTT, etc.)

---

## 🐛 Bug Fixes & Improvements

### Improve error handling
**Priority:** High  
**Effort:** Medium  
**Labels:** `bug`, `enhancement`

Better error messages for:
- Network failures
- API errors (quota, authentication)
- Invalid file formats
- Timeout scenarios

Include actionable recovery steps.

---

### Add input validation
**Priority:** High  
**Effort:** Low  
**Labels:** `enhancement`, `validation`

Validate before API calls:
- API key format/length
- File size limits (provider-specific)
- Supported audio formats
- Audio duration limits

Show clear error messages early.

---

### Add retry logic
**Priority:** Medium  
**Effort:** Medium  
**Labels:** `enhancement`, `reliability`

Handle transient failures:
- Exponential backoff
- Configurable retry attempts
- Different strategies per error type
- User notification of retries

---

### Optimize large file handling
**Priority:** Medium  
**Effort:** High  
**Labels:** `enhancement`, `performance`

For files >25MB:
- Chunk audio files
- Stream processing
- Progress indication per chunk
- Stitch results together

---

## 🔒 Security

### Add dependency vulnerability scanning
**Priority:** High  
**Effort:** Low  
**Labels:** `security`, `ci-cd`

Automated security checks:
- npm audit in CI
- Dependabot or Renovate
- Security alerts on PRs
- Regular dependency updates

---

### Add API key validation
**Priority:** Medium  
**Effort:** Low  
**Labels:** `security`, `enhancement`

Verify API keys:
- Basic format validation
- Optional: Test API call
- Clear feedback if invalid
- Prevent unnecessary API calls

---

### Add rate limiting awareness
**Priority:** Medium  
**Effort:** Medium  
**Labels:** `enhancement`, `reliability`

Handle provider rate limits:
- Detect 429 responses
- Backoff strategy
- User notification
- Queue management

---

## 📦 Distribution

### Prepare for Joplin Plugin Marketplace submission
**Priority:** High  
**Effort:** Medium  
**Labels:** `distribution`, `documentation`

Complete marketplace requirements:
- Screenshots
- Detailed description
- Keywords and categories
- Version 1.0 stability
- Documentation completeness

---

### Add screenshots and demo
**Priority:** High  
**Effort:** Low  
**Labels:** `documentation`, `good-first-issue`

Visual documentation:
- Settings configuration screenshot
- Transcription in action
- Example results
- GIF/video demo (optional)

---

### Add keywords and categories to manifest
**Priority:** Medium  
**Effort:** Low  
**Labels:** `distribution`, `good-first-issue`

**Current:** Empty arrays in `manifest.json` (lines 11-12)  
**Proposed:** Add relevant keywords and categories for discoverability

Suggested keywords: `audio`, `transcription`, `ai`, `whisper`, `gemini`, `speech-to-text`  
Suggested categories: `productivity`, `ai`

---

## 🛠️ Developer Experience

### Add development documentation
**Priority:** Medium  
**Effort:** Low  
**Labels:** `documentation`

Developer guide covering:
- Local development setup
- Debugging in Joplin
- Common development issues
- Architecture overview
- API integration patterns

---

### Add pre-commit hooks
**Priority:** Low  
**Effort:** Low  
**Labels:** `tooling`

Automated checks using Husky:
- Run linting
- Run type checking
- Run tests (fast subset)
- Prevent commits with errors

---

### Add changelog
**Priority:** Medium  
**Effort:** Low  
**Labels:** `documentation`, `good-first-issue`

Track changes across versions:
- Keep a Changelog format
- Semantic versioning
- Categorized changes (Added, Changed, Fixed, etc.)
- Migration notes for breaking changes

---

## Legend

- **Priority:** High (core functionality/critical) | Medium (important but not urgent) | Low (nice to have)
- **Effort:** Low (<1 day) | Medium (1-3 days) | High (>3 days)
- **Labels:** Suggested GitHub issue labels

---

## Quick Start Suggestions

If you're new to the project, consider starting with issues labeled `good-first-issue`:
1. Add code linting and formatting
2. Add CONTRIBUTING.md
3. Add CODE_OF_CONDUCT.md
4. Add SECURITY.md
5. Create wiki for "Adding New Services" guide
6. Add screenshots to README
7. Add keywords and categories to manifest

---

*This backlog is a living document. Issues will be created from this list as they are prioritized.*
