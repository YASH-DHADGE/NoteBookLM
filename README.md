<h1 align="center">
  <br>
  <img src="https://ui-avatars.com/api/?name=DocuMind&background=6366f1&color=fff&size=180&bold=true" alt="DocuMind" width="120">
  <br>
  DocuMind (NotebookLM Clone)
  <br>
</h1>

<h4 align="center">A high-performance, full-stack AI Document Analysis Platform built on the MERN stack.</h4>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#%EF%B8%8F-technology-stack">Tech Stack</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-environment-variables">Env Variables</a>
</p>

---

## 🚀 Features

DocuMind goes beyond standard document management by orchestrating complex AI pipelines to transform your static documents (`.pdf`, `.docx`, `.txt`) into highly interactive, multimodal learning experiences—heavily inspired by Google's NotebookLM.

### 🧠 Core Document Intelligence
- **Notebook Workspaces**: Isolate your uploaded documents, flashcards, and media into distinct "Notebooks".
- **Vectorless RAG**: Extract, analyze, and map document contents using intelligent parsing algorithms without relying on heavy external vector databases.
- **AI Executive Summary & Deep Dive**: Instantly generates comprehensive summaries utilizing **n8n** webhook orchestration.

### 🎙️ Multimodal Learning Features
- **AI Podcast Generation**: Transforms static documents into professional, multi-host audio podcasts. Utilizes **Kokoro TTS** for shockingly authentic voice synthesis, complete with an interactive audio player and live transcript highlighting.
- **Video Overview Pipeline**: Distills your documents into a beautifully orchestrated `.mp4` video lecture! 
  - Generates HTML presentations autonomously.
  - **Mistral AI** scripts the narration based exactly on the slide visuals.
  - Utilizes **Puppeteer** and **FFmpeg** in the background to apply *Ken Burns* zoom/pan motion effects.
  - Features real-time **Server-Sent Events (SSE)** generation tracking and interactive filmstrip chapter-scrubbing.
- **AI Presentation Generator**: Converts your documents directly into a beautifully styled, downloadable `.pptx` PowerPoint file.

### 📚 Study & Retention Tools
- **AI Quiz Generation**: Dynamically spins up multiple-choice quizzes (varying difficulties) to test your knowledge on the document content.
- **Smart Flashcards**: Autogenerates comprehensive flashcards from your documents, complete with Spaced Repetition tracking functionality.
- **Interactive Mindmaps**: Parses the document hierarchy to automatically build dynamic, explorable D3.js mind maps visually linking topics together.

### 🔒 Foundation
- **Secure Authentication**: Robust JWT-based authentication using HTTP-only cookies and bcrypt hashing.
- **Gorgeous UI/UX**: Extensively styled with custom CSS variables, glassmorphism, fluid micro-animations, and a highly accessible dark-mode UI.

---

## 🛠️ Technology Stack

### Frontend Hub
- **React 18** & **Vite**: Blistering fast component rendering and dev-server.
- **React Router v6**: Client-side single-page app navigation.
- **React Hook Form**: For performant and validated form handling.
- **React D3 Tree**: Rendering interactive hierarchy mindmaps.
- **Native Browser APIs**: Leveraging `EventSource` for SSE and Web Speech API components.

### Backend Engine
- **Node.js** & **Express.js**: Asynchronous, non-blocking I/O API foundation.
- **MongoDB** & **Mongoose**: Flexible NoSQL storage for Jobs, Documents, and User State.
- **Fluent-FFmpeg** & **Puppeteer**: Headless Chromium and C++ media engines orchestrated by Node to compose video arrays.
- **File Parsing**: Utilizing `mammoth` (Word) and `pdfjs-dist` (PDF) for robust native text extraction.

### AI & Orchestration
- **n8n Webhooks**: Local or cloud-deployed low-code workflow automation nodes acting as AI routing middleware.
- **Mistral AI API**: Zero-shot precision prompting utilized for structural operations like Video Scripting.
- **Google Text-to-Speech (gTTS)** & **Kokoro**: Cutting-edge speech synthesis tools.

---

## 🧩 Architecture

The DocuMind platform is designed entirely around **Asynchronous Job Queues** to keep the API hyper-responsive during heavy media generations.

When you request an AI Video or Podcast:
1. The Express server instantly responds with `HTTP 202 Accepted` and a `JobId`.
2. The user's React frontend connects via an **EventSource (SSE)** stream.
3. Node.js executes the heavy lifting in the background—fetching the presentation HTML via n8n, querying Mistral AI for the script, launching Puppeteer to snap slides, triggering parallel `.mp4` chunks via FFmpeg.
4. The SSE connection pipes progress (`15%`, `45%`, `90%`) cleanly to the UI Stepper until the static file URL is resolved.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js v18+
- MongoDB (local `mongod` or Atlas cluster)
- Active **n8n** Instance (Local desktop app or Cloud instance required for webhook workflows)
- Mistral AI API Key (If utilizing the Video Pipeline)

### 2. Clone & Setup

```bash
git clone https://github.com/yourusername/DocuMind.git
cd DocuMind
```

### 3. Backend Setup

```bash
cd backend
npm install

# Create your .env file
# (See Environment Variables section below)

# Start the Node.js API server
npm run dev
```

### 4. Frontend Setup

```bash
# Open a new terminal from the project root
cd frontend
npm install

# Start the Vite React server
npm run dev
```

Navigate to `http://localhost:5173` to view the application!

---

## 🔧 Environment Variables

### Backend (`/backend/.env`)

```env
NODE_ENV=development
PORT=5000

# Database & Auth
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.ex.mongodb.net/
JWT_SECRET=your_super_secret_jwt_string
JWT_EXPIRE=30d

# Orchestration Webhooks (n8n)
N8N_CONTENT_ANALYSIS_URL=http://localhost:5678/webhook/docanalyser
N8N_PPT_WEBHOOK_URL=http://localhost:5678/webhook/ppt-generator
N8N_FLASHCARD_URL=http://localhost:5678/webhook/cards
N8N_PODCAST_URL=http://localhost:5678/webhook/podcast
N8N_MINDMAP_URL=http://localhost:5678/webhook/notebooklm-mindmap
N8N_QUIZ_URL=http://localhost:5678/webhook-test/generate-quiz

# External APIs
MISTRAL_API_KEY=your_mistral_api_key_here
```

---

## 🎨 UI/UX Design System

DocuMind is purposefully designed to feel **premium and immersive**. 
Rather than utilizing basic utility frameworks like Tailwind for standard layouts, the application uses curated, Vanilla CSS Modules featuring:
- Seamless **Glassmorphism** overlays.
- Dynamic **Micro-animations** upon hover and interaction.
- Synchronized color palettes tailored to deep dark-mode (HSL variants of Iris and primary blues).
- **Smooth Stepper UI's** handling multi-minute async tasks so users never face "dead air" while waiting for generations.

---

## 🤝 Contributing

We welcome contributions to make Document Intelligence more accessible!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the ISC License. See `LICENSE` for more information.

---
<p align="center">Built with ❤️ using the MERN Stack and leading AI orchestration.</p>
