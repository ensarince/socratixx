# SOCRATIX - AI-Powered Socratic Reasoning Platform

## Overview

SOCRATIX is an innovative educational platform that uses AI to foster critical thinking through Socratic reasoning. Instead of providing direct answers, the system guides learners through carefully crafted questions, helping them discover answers themselves.

## Vision

We're reimagining educational interactions as an "anti-chat" with multiple UI paradigms:
- **Mind Map**: Visual expansion of thought processes
- **Focus Card**: One question at a time, forcing presence
- **Infinite Canvas**: Sticky notes for collaborative brainstorming
- **Flip Mode**: Teaching AI as a student

## Architecture

### Backend (Node.js/Express)
- RESTful API endpoints for Socratic reasoning
- OpenAI GPT-4o-mini integration for intelligent questioning
- Session state management
- Thought process visualization data generation

### Frontend (React + TypeScript + Vite)
- Multiple UI view modes
- Real-time API integration
- Interactive visualization of learning journey

## Setup Instructions

### Prerequisites
- Node.js >= 18
- npm or yarn
- OpenAI API key

### Backend Setup

1. **Navigate to server directory:**
   ```bash
   cd server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

4. **Add your OpenAI API key:**
   ```
   OPENAI_API_KEY=your_actual_key_here
   PORT=3000
   NODE_ENV=development
   ```

5. **Start the server:**
   ```bash
   npm run dev
   ```

   Server will run at `http://localhost:3000`

### Frontend Setup

1. **From root directory, install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env.local` file (or copy from `.env.example`):**
   ```
   VITE_API_BASE_URL=http://localhost:3000/api
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

   Frontend will run at `http://localhost:5173`

## API Endpoints

### Session Management
- `POST /api/session/init` - Initialize a new Socratic session
- `GET /api/session/state` - Get current session state
- `POST /api/session/reset` - Reset the session

### Question Generation
- `POST /api/question/generate` - Generate initial Socratic question
- `POST /api/question/respond` - Process answer and generate next question

### Data Retrieval
- `GET /api/visualization/thought-process` - Get thought process nodes and connections
- `GET /api/conversation/history` - Get full conversation history

## Project Structure

```
socratixxx/
├── server/
│   ├── server.js              # Express backend
│   ├── package.json
│   ├── .env.example
│   └── vercel.json
├── src/
│   ├── services/
│   │   └── socratic-api.ts   # API service layer
│   ├── Components/
│   │   ├── socratic-app.tsx
│   │   ├── mind-map-view.tsx
│   │   ├── focus-card-view.tsx
│   │   ├── infinite-canvas-view.tsx
│   │   └── flip-mode-view.tsx
│   ├── App.tsx
│   └── main.tsx
├── .env.example
└── package.json
```

## Development Workflow

1. **Backend Development:**
   - Server runs on port 3000
   - Auto-restarts with nodemon on file changes
   - Check logs for API requests

2. **Frontend Development:**
   - Frontend runs on port 5173
   - Hot module replacement (HMR) enabled
   - Connect to backend via API service

## Key Features

### Socratic Method Implementation
- **No direct answers**: Only guiding questions
- **Adaptive questioning**: Questions deepen based on responses
- **Thought tracking**: Records reasoning journey
- **Depth awareness**: Monitors complexity level

### Visualization Modes
Each mode offers unique interaction patterns:
- Mind Map: Non-linear, hierarchical exploration
- Focus Card: Minimal, attention-focused
- Infinite Canvas: Whiteboard-like collaboration
- Flip Mode: Learner teaches AI

## Environment Variables

### Backend (server/.env)
```
OPENAI_API_KEY=          # Your OpenAI API key
PORT=3000               # Server port
NODE_ENV=development    # development/production
```

### Frontend (.env.local)
```
VITE_API_BASE_URL=http://localhost:3000/api
```

## Next Steps

1. **Implement UI Views:**
   - Create responsive components for each view mode
   - Add visualization libraries (D3.js, etc.)

2. **Enhance Backend:**
   - Add database for session persistence
   - Implement user authentication
   - Add analytics tracking

3. **Testing:**
   - Unit tests for API endpoints
   - Integration tests for frontend-backend flow
   - E2E tests for user workflows

4. **Deployment:**
   - Frontend: Vercel, Netlify, or similar
   - Backend: Vercel, Heroku, or cloud platforms

## Troubleshooting

### CORS Issues
- Ensure backend is running on port 3000
- Check VITE_API_BASE_URL in frontend .env

### API Connection Errors
- Verify OpenAI API key is valid
- Check both servers are running
- Review console logs for detailed errors

### Port Already in Use
- Backend: `lsof -i :3000` then kill process
- Frontend: Vite will use next available port

## Contributing

Follow the established patterns:
- Use TypeScript for type safety
- Keep components focused and reusable
- Document API changes
- Test before pushing

## License

ISC

---

**Happy Socratic Questioning! 🤔**
