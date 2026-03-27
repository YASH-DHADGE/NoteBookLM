# NotebookLM Clone - Architecture & Tech Stack Explainer

This document outlines the architecture, technology stack, and specific implementation details of the **NotebookLM Clone**, particularly focusing on the newly integrated AI features (Podcast Generation, Video Overview, Mindmaps, Quizzes, and Flashcards).

---

## 🏗 Technology Stack

### **Frontend**
*   **React (Vite)**: High-performance frontend rendering framework.
*   **React Router**: For handling SPA navigation (Workspaces, Dashboards, Video/Podcast UI).
*   **CSS3 & CSS Modules**: Custom-built, responsive styling using CSS Variables for theming (e.g., modern dark mode vibes).
*   **Axios**: For making HTTP requests to the Node.js backend.
*   **React Hot Toast**: For smooth, non-blocking UI notifications.
*   **EventSource API**: Natively built-in for consuming Real-Time Server-Sent Events (SSE) to render live progress bars.

### **Backend**
*   **Node.js / Express**: Fast, non-blocking I/O server.
*   **MongoDB (Mongoose)**: NoSQL database to store user sessions, extracted document text, caching (like script caches), and job statuses.
*   **Multer**: Handling multipart form data for PDF/Word document uploads.
*   **pdfjs-dist & mammoth**: Tools to extract raw text from uploaded PDFs and Word Documents natively on the server.
*   **Fluent-FFmpeg / Ffmpeg-Static**: Powerful command-line video/audio processing framework called via Node.js for concatenating media, padding audio, mapping streams, and applying visual filters (`zoompan`).
*   **Puppeteer**: Headless Chromium instance utilized to render HTML presentations and snap high-resolution (1080p) screenshots for video frames.
*   **Google Text-to-Speech (gTTS)**: Lightweight engine for generating temporary mp3 files representing slide narrations.

### **AI & Workflow Layers**
*   **n8n Webhooks**: Highly customized low-code automated workflows that map raw extracted text to specialized output nodes (e.g., HTML presentations, JSON flashcards).
*   **Mistral AI (`mistral-large-latest`)**: Direct API integration responsible for reading raw presentation HTML and acting as an expert narrator to generate precise, style-specific audio scripts.

---

## 🧩 System Architecture Pipeline

The following Mermaid diagram maps out the data flow from the moment a user uploads a document to the point where they view a fully compiled MP4 Video Presentation.

```mermaid
graph TD
    subgraph Frontend [React Frontend]
        UI[User Interface] -- Uploads Doc --> EP1[/api/content/upload/]
        UI -- Clicks 'Generate Video' --> EP2[/api/video/generate-script/]
        EP2_Res[Receives Job ID] --> UI
        UI -- Polls SSE --> EP3[/api/video/status/:jobId]
    end

    subgraph Backend [Node.js / Express Backend]
        EP1 -- 1. Extract Text --> DB[(MongoDB)]
        EP2 -- 2. Send Topic/Text --> N8N[n8n Webhook]
        N8N -- Returns HTML --> EP2
        EP2 -- 3. Send HTML --> Mistral[Mistral AI API]
        Mistral -- Returns JSON Script --> EP2
        EP2 -- 4. Spawns Async Job --> JQ[[In-Memory Job Queue]]
        
        JQ -- 5. Puppeteer --> HTML[Renders HTML]
        HTML -- Takes Screenshots --> IMG(1080p Images Array)
        
        JQ -- 6. Promise.all() --> TTS[Google TTS]
        TTS -- Synthesizes Narration --> AUD(MP3 Audio Array)
        
        JQ -- 7. FFmpeg Assembly --> FFMPEG[Fluent FFmpeg]
        IMG --> FFMPEG
        AUD --> FFMPEG
        FFMPEG -- Applies Padding & Encoding --> MP4(Final optimized .mp4)
    end
    
    MP4 -- Returns Static File URL --> JQ
    JQ -- Updates Status via EventSource --> EP3
    EP3 -- Renders Progress UI --> UI
```

---

## ⚙️ Key Feature Workflows

### 1. Document Ingestion
When a user uploads a file (`.pdf`, `.docx`), `multer` catches it in memory. Based on the MimeType, the backend passes it to either `pdfjs-dist` or `mammoth` to extract the raw text. This raw text, along with a word count, is saved to the `Content` model in MongoDB. The document is then passed to an `n8n` analysis webhook to generate Executive Summaries and Detailed Analyses.

### 2. Live Job Tracing (Server-Sent Events)
Because generating media (video/audio) is highly CPU intensive and takes >60 seconds, it cannot operate on a standard HTTP Request-Response cycle (which would time out).
1. When a user requests a video, the server generates a unique `jobId`, queues the metadata, and instantly responds with HTTP 202 (Accepted).
2. The frontend opens an `EventSource` connection pointing to `/api/video/status/:jobId`.
3. The Node.js worker executes the process asynchronously, iteratively firing `res.write()` back through the open TCP connection updating the progress percentage (0 - 100%) and the current phase text (e.g., "Capturing slides...", "Encoding chunks..."). 

### 3. Orchestrated Video Assembly
The most complex pipeline in the application lies in `videoController.js`.
1. **HTML Capture**: It launches a `Puppeteer` headless browser. It sets the viewport to 1920x1080, injects the n8n-generated presentation HTML, and takes a seamless screenshot of every slide.
2. **Parallel Narration**: It takes the JSON script returned by **Mistral AI** and uses `Promise.all()` to generate the `gTTS` audio files for all slides concurrently, cutting audio processing time by 75%.
3. **Chunk Encoding & Concatenation**: Using `fluent-ffmpeg`, it loops through every matched Image + MP3 pair. It overlays them together, forces a 25fps framerate, and outputs tiny `.mp4` chunks. Finally, it uses FFmpeg's `concat` demuxer to stitch all slide chunks seamlessly, adding `-movflags +faststart` to allow instant web streaming.
