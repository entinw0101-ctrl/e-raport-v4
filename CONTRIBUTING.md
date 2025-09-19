# Contributing Guide - E-RAPOT NUURUSH SHOLAAH

Terima kasih atas minat Anda untuk berkontribusi pada proyek E-RAPOT!

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm atau yarn
- Git
- Akun Supabase untuk testing

### Setup Development Environment

1. **Fork dan Clone**
   \`\`\`bash
   git clone https://github.com/your-username/e-rapot-nuurush-sholaah.git
   cd e-rapot-nuurush-sholaah
   \`\`\`

2. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Setup Environment**
   \`\`\`bash
   cp .env.example .env.local
   # Edit .env.local dengan credentials Supabase
   \`\`\`

4. **Setup Database**
   \`\`\`bash
   npx prisma generate
   npx prisma db push
   npm run db:seed
   \`\`\`

5. **Run Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`

## 📋 Development Guidelines

### Code Style
- Gunakan TypeScript untuk semua file
- Follow ESLint configuration
- Gunakan Prettier untuk formatting
- Naming convention: camelCase untuk variables/functions, PascalCase untuk components

### Commit Messages
Gunakan format conventional commits:
\`\`\`
type(scope): description

feat(auth): add login functionality
fix(api): resolve database connection issue
docs(readme): update installation guide
\`\`\`

### Branch Naming
\`\`\`
feature/feature-name
bugfix/bug-description
hotfix/critical-fix
docs/documentation-update
\`\`\`

### Pull Request Process

1. **Create Feature Branch**
   \`\`\`bash
   git checkout -b feature/new-feature
   \`\`\`

2. **Make Changes**
   - Write clean, documented code
   - Add tests if applicable
   - Update documentation

3. **Test Changes**
   \`\`\`bash
   npm run lint
   npm run build
   npm run test # if tests exist
   \`\`\`

4. **Commit Changes**
   \`\`\`bash
   git add .
   git commit -m "feat(scope): description"
   \`\`\`

5. **Push and Create PR**
   \`\`\`bash
   git push origin feature/new-feature
   \`\`\`

## 🏗️ Project Structure

\`\`\`
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── (pages)/           # Page components
│   └── globals.css        # Global styles
├── src/
│   ├── components/        # Reusable components
│   ├── services/          # API services
│   └── types/             # TypeScript types
├── lib/                   # Utilities and configurations
├── prisma/                # Database schema
├── scripts/               # Database and utility scripts
└── public/                # Static assets
\`\`\`

## 🧪 Testing

### Running Tests
\`\`\`bash
npm run test          # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run with coverage report
\`\`\`

### Writing Tests
- Unit tests untuk utilities dan services
- Integration tests untuk API routes
- Component tests untuk React components

## 📝 Documentation

### Code Documentation
- Gunakan JSDoc untuk functions dan classes
- Comment untuk logic yang kompleks
- README untuk setiap major feature

### API Documentation
- Update API_DOCUMENTATION.md untuk endpoint baru
- Include request/response examples
- Document error cases

## 🐛 Bug Reports

### Before Reporting
1. Check existing issues
2. Reproduce the bug
3. Test on latest version

### Bug Report Template
\`\`\`markdown
**Describe the bug**
A clear description of the bug.

**To Reproduce**
Steps to reproduce the behavior.

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g. Windows 10]
- Browser: [e.g. Chrome 91]
- Node.js version: [e.g. 18.17.0]
\`\`\`

## ✨ Feature Requests

### Feature Request Template
\`\`\`markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Additional context**
Any other context about the feature request.
\`\`\`

## 🔍 Code Review Process

### For Contributors
- Self-review your code before submitting
- Ensure all tests pass
- Update documentation
- Keep PRs focused and small

### For Reviewers
- Check code quality and style
- Verify functionality works
- Review security implications
- Provide constructive feedback

## 📚 Resources

### Learning Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Project Resources
- [API Documentation](./API_DOCUMENTATION.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Database Schema](./prisma/schema.prisma)

## 🤝 Community

### Communication
- GitHub Issues untuk bug reports dan feature requests
- GitHub Discussions untuk general questions
- Email: dev@nuurushsholaah.com untuk private matters

### Code of Conduct
- Be respectful and inclusive
- Help others learn and grow
- Focus on constructive feedback
- Follow project guidelines

## 🎯 Contribution Areas

### High Priority
- Bug fixes
- Performance improvements
- Security enhancements
- Documentation updates

### Medium Priority
- New features
- UI/UX improvements
- Test coverage
- Code refactoring

### Low Priority
- Code style improvements
- Minor optimizations
- Additional tooling

## 🏆 Recognition

Contributors akan diakui dalam:
- CONTRIBUTORS.md file
- Release notes
- Project documentation

---

**Terima kasih atas kontribusi Anda! 🙏**
