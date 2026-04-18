# Contributing to MilestoneEscrow

Thank you for your interest in contributing to MilestoneEscrow! This document provides guidelines for contributing to the project.

---

## Code of Conduct

Be respectful, inclusive, and professional. We're building a tool to help freelancers worldwide—let's maintain a welcoming community.

---

## How to Contribute

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Use the bug report template
3. Include:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots (if applicable)
   - Environment (browser, OS, wallet version)

### Suggesting Features

1. Check existing feature requests
2. Use the feature request template
3. Explain:
   - Problem it solves
   - Proposed solution
   - Alternative solutions considered
   - Impact on users

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write/update tests
5. Ensure tests pass (`npm test` and `cargo test`)
6. Commit with clear messages
7. Push to your fork
8. Open a pull request

---

## Development Setup

### Prerequisites

- Node.js 18+
- Rust 1.74.0+
- Soroban CLI 22.0.0+
- Freighter Wallet

### Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/milestone-escrow.git
cd milestone-escrow

# Install frontend dependencies
cd frontend
npm install

# Build contract
cd ../contract
cargo build
```

---

## Coding Standards

### TypeScript/React

- Use TypeScript strict mode
- Follow existing code style
- Use functional components with hooks
- Add JSDoc comments for complex functions
- Keep components small and focused

### Rust/Soroban

- Follow Rust naming conventions
- Add doc comments for public functions
- Use `cargo fmt` before committing
- Run `cargo clippy` and fix warnings
- Keep functions small and testable

### Testing

- Write tests for new features
- Maintain >80% code coverage
- Use property-based testing for data transformations
- Test edge cases and error conditions

---

## Commit Messages

Use conventional commits:

```
feat: Add milestone verification
fix: Resolve amount input sanitization bug
docs: Update deployment guide
test: Add property tests for offline sync
refactor: Simplify error handling logic
```

---

## Project Structure

```
milestone-escrow/
├── frontend/           # React application
│   ├── src/
│   │   ├── pages/     # Page components
│   │   ├── components/# Reusable components
│   │   ├── utils/     # Utility functions
│   │   └── *.ts       # Service modules
│   └── package.json
├── contract/          # Soroban smart contract
│   ├── src/
│   │   ├── lib.rs    # Contract implementation
│   │   └── test.rs   # Contract tests
│   └── Cargo.toml
└── supabase/         # Database migrations
```

---

## Testing Guidelines

### Frontend Tests

```bash
cd frontend
npm test
```

**Test Categories**:
- Unit tests: Individual functions
- Integration tests: Component interactions
- Property tests: Data transformations

### Contract Tests

```bash
cd contract
cargo test
```

**Test Requirements**:
- Happy path scenarios
- Edge cases
- Authorization checks
- State verification

---

## Documentation

- Update README.md for user-facing changes
- Update PROJECT.md for feature additions
- Update contract/README.md for contract changes
- Add inline comments for complex logic
- Update DEPLOYMENT.md for infrastructure changes

---

## Review Process

1. **Automated Checks**: CI runs tests and linting
2. **Code Review**: Maintainer reviews code quality
3. **Testing**: Reviewer tests functionality
4. **Approval**: Maintainer approves and merges

---

## Areas for Contribution

### High Priority

- [ ] Multi-asset support (USDC, custom tokens)
- [ ] Dispute resolution mechanism
- [ ] Time-locked escrows
- [ ] Batch operations
- [ ] Mobile app (React Native)

### Medium Priority

- [ ] Advanced filtering in history page
- [ ] Export escrow data (CSV/PDF)
- [ ] Email notifications
- [ ] Multi-language support
- [ ] Analytics dashboard

### Low Priority

- [ ] Dark mode improvements
- [ ] Accessibility enhancements
- [ ] Performance optimizations
- [ ] Additional test coverage
- [ ] Documentation improvements

---

## Questions?

- Open a discussion on GitHub
- Join our Discord: [Coming Soon]
- Email: dev@milestoneescrow.com

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to MilestoneEscrow! 🚀
