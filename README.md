# DocuMind - Document Analysis Platform

A full-stack MERN (MongoDB, Express.js, React, Node.js) web application for intelligent document analysis. This platform provides user authentication, profile management, and a foundation for advanced document intelligence features.

![DocuMind](https://ui-avatars.com/api/?name=DocuMind&background=6366f1&color=fff&size=128&bold=true)

## 🚀 Features

- **User Authentication**: Secure JWT-based authentication with HTTP-only cookies
- **User Management**: Complete profile management with password updates
- **AI Presentation Generator**: Create PowerPoint presentations with AI (Gemini + n8n)
- **Modern UI**: Beautiful dark theme with glassmorphism effects and animations
- **Responsive Design**: Fully responsive across all device sizes
- **Protected Routes**: Secure access to authenticated pages
- **Form Validation**: Client and server-side validation

## 🎯 AI Presentation Generator

Generate professional PowerPoint presentations using AI:

1. **User fills form** with topic, audience, key points, and color scheme
2. **n8n webhook** receives request and calls Google Gemini AI
3. **AI generates** professional HTML slides with animations
4. **Puppeteer renders** HTML and captures high-quality screenshots
5. **pptxgenjs** compiles screenshots into a downloadable PPTX file

### Prerequisites for PPT Generator:
- [n8n](https://n8n.io/) instance running (local or cloud)
- Google Gemini API key configured in n8n
- Import the workflow from `n8n/PPT_Generator_Workflow.json`

## 📁 Project Structure

```
NoteBookLM/
├── backend/                 # Express.js API server
│   ├── config/             # Database configuration
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Custom middleware
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   ├── utils/              # Utility functions
│   ├── .env                # Environment variables
│   └── server.js           # Entry point
│
├── frontend/               # React application
│   ├── public/             # Static assets
│   └── src/
│       ├── components/     # Reusable components
│       ├── context/        # React context providers
│       ├── hooks/          # Custom hooks
│       ├── pages/          # Page components
│       ├── services/       # API services
│       ├── styles/         # Global styles
│       ├── App.jsx         # Main app component
│       └── main.jsx        # Entry point
│
└── README.md
```

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **React Router v6** - Client-side routing
- **React Hook Form** - Form handling
- **Axios** - HTTP client
- **React Hot Toast** - Toast notifications
- **React Icons** - Icon library

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation

## 📋 Prerequisites

- Node.js v18 or higher
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd NoteBookLM
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment variables
# Edit .env file with your settings:
# - MONGO_URI: Your MongoDB connection string
# - JWT_SECRET: A secure random string
# - PORT: Server port (default: 5000)

# Start the development server
npm run dev
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## 🔧 Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/document_analysis` |
| `JWT_SECRET` | JWT signing secret | (required) |
| `JWT_EXPIRE` | JWT expiration time | `30d` |

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login user |
| `POST` | `/api/auth/logout` | Logout user |
| `GET` | `/api/auth/me` | Get current user |

### User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/profile` | Get user profile |
| `PUT` | `/api/users/profile` | Update user profile |
| `PUT` | `/api/users/password` | Update password |
| `DELETE` | `/api/users/account` | Delete account |

## 📱 Pages

| Route | Description | Access |
|-------|-------------|--------|
| `/` | Landing page | Public |
| `/login` | Login page | Public |
| `/signup` | Registration page | Public |
| `/dashboard` | Main dashboard | Protected |
| `/profile` | User profile settings | Protected |

## 🔒 Security Features

- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Tokens**: HTTP-only cookies with secure flag in production
- **CORS**: Configured for frontend origin
- **Input Validation**: Server-side validation on all endpoints
- **Error Handling**: Sanitized error messages in production

## 🎨 Design System

The application uses a custom CSS design system with:

- CSS custom properties for theming
- Dark theme by default
- Responsive breakpoints (480px, 768px, 1024px)
- Glassmorphism effects
- Smooth animations and transitions
- Modern typography with Inter font

## 📦 Available Scripts

### Backend

```bash
npm start      # Start production server
npm run dev    # Start development server with hot reload
```

### Frontend

```bash
npm run dev    # Start development server
npm run build  # Build for production
npm run preview # Preview production build
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

---

Built with ❤️ using the MERN Stack
