# Contributing to Arogya Raksha

Thank you for your interest in contributing to **Arogya Raksha**! 🏥

## 🚀 Getting Started

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/<your-username>/Arogya.git`
3. **Install** dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
4. **Set up** environment variables (see `.env.example` files in both `backend/` and `frontend/`)
5. **Run** the development servers:
   ```bash
   # Terminal 1 — Backend
   cd backend && npm start

   # Terminal 2 — Frontend
   cd frontend && npm run dev
   ```

## 📋 Development Guidelines

### Code Style
- **Frontend**: TypeScript, React functional components, Tailwind CSS
- **Backend**: JavaScript (CommonJS), Express 5 route/service pattern
- Keep components focused and reusable
- Use meaningful variable and function names

### Commit Messages
Follow conventional commits:
```
feat: add diabetes risk predictor
fix: resolve MediBot voice input on mobile
docs: update API endpoint documentation
perf: optimize hospital search query
```

### Pull Requests
1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make your changes with clear, atomic commits
3. Test your changes locally
4. Submit a PR with a clear description

## 🏗 Architecture Overview

```
frontend/          → Next.js 16 (React 19, TypeScript, Tailwind 4)
backend/           → Express 5 (Node.js, Socket.io, Groq SDK)
backend/routes/    → 17 API route modules
backend/services/  → 7 business logic services
backend/models/    → 9 data models
```

## 🐛 Bug Reports

Open an issue with:
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS information
- Screenshots if applicable

## 📝 License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).

---

> Built with ❤️ for the Google Gemini Hackathon
