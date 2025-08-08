# Contributing to OneMFin

Thank you for your interest in contributing to OneMFin! This document provides guidelines for contributing to the project.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/OneMFin.git`
3. Install dependencies:
   ```bash
   npm install
   cd backend && npm install
   ```
4. Set up environment variables (copy from `env.example`)
5. Start development servers:
   ```bash
   npm run dev          # Frontend
   cd backend && npm run dev  # Backend
   ```

## 📋 Development Guidelines

### Code Standards
- **TypeScript**: Use strict mode, avoid `any` types
- **ESLint**: Follow configured rules
- **Prettier**: Use provided formatting
- **Git Hooks**: Pre-commit linting enabled

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

**Examples:**
```
feat(auth): add OAuth2 authentication
fix(api): resolve CORS issue in production
docs(readme): update installation instructions
```

### Branch Naming
- `feature/feature-name`
- `bugfix/issue-description`
- `hotfix/critical-fix`
- `chore/tooling-update`

## 🧪 Testing

### Frontend Tests
```bash
npm run test
npm run test:watch
npm run test:coverage
```

### Backend Tests
```bash
cd backend
npm run test
npm run test:watch
npm run test:coverage
```

### Test Coverage Requirements
- **Frontend**: Minimum 80% coverage
- **Backend**: Minimum 85% coverage
- **Critical paths**: 100% coverage

## 🔒 Security

### Security Checklist
- [ ] Input validation implemented
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Rate limiting configured
- [ ] Authentication middleware
- [ ] Environment variables secured

### Reporting Security Issues
- **Email**: nischalkanishk@gmail.com
- **Subject**: `[SECURITY] OneMFin - Issue Description`
- **Do not** create public issues for security vulnerabilities

## 📝 Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make Changes**
   - Follow coding standards
   - Add tests for new features
   - Update documentation

3. **Run Quality Checks**
   ```bash
   npm run lint
   npm run type-check
   npm run test
   cd backend && npm run lint && npm run test
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature
   ```

6. **PR Review Process**
   - Automated checks must pass
   - Code review required
   - Tests must pass
   - Documentation updated

## 🏗️ Architecture Guidelines

### Frontend Architecture
- **Components**: Reusable, single responsibility
- **State Management**: React Context + TanStack Query
- **Routing**: React Router with protected routes
- **Styling**: Tailwind CSS + Shadcn UI

### Backend Architecture
- **API Design**: RESTful with consistent naming
- **Middleware**: Authentication, validation, error handling
- **Database**: Supabase with RLS
- **Security**: JWT tokens, rate limiting

### Database Guidelines
- **Naming**: snake_case for tables/columns
- **Indexes**: Add for frequently queried fields
- **RLS**: Row Level Security enabled
- **Migrations**: Version controlled schema changes

## 📚 Documentation

### Required Documentation
- **API Documentation**: OpenAPI/Swagger specs
- **Component Documentation**: Storybook (planned)
- **Database Schema**: ERD diagrams
- **Deployment Guide**: Step-by-step instructions

### Documentation Standards
- Clear, concise writing
- Code examples
- Screenshots for UI changes
- Version compatibility notes

## 🚀 Deployment

### Environment Variables
- Never commit sensitive data
- Use environment-specific configs
- Validate all required variables

### Build Process
- Automated testing
- Security scanning
- Performance optimization
- Asset optimization

## 🤝 Code Review

### Review Checklist
- [ ] Code follows standards
- [ ] Tests are comprehensive
- [ ] Documentation updated
- [ ] Security considerations
- [ ] Performance impact
- [ ] Accessibility compliance

### Review Process
1. **Automated Checks**: CI/CD pipeline
2. **Peer Review**: At least one approval
3. **Security Review**: For sensitive changes
4. **Final Review**: Maintainer approval

## 📞 Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: nischalkanishk@gmail.com
- **Documentation**: Check `docs/` folder first

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.
