# AI-Powered Paper Generation & Evaluation System

A modern MERN application for professors and educators to generate high-quality, concept-driven exam papers using AI, with support for handwritten notes and multi-material synthesis.

## 🚀 Key Features

- **AI Paper Generation**: Think like a professor! Generates academically rigorous MCQs and Theory questions based on your specific documents.
- **Handwritten OCR**: Support for scanned and handwritten PDF notes using vision-based AI text extraction.
- **Multi-Material Synthesis**: Mix and match multiple PDFs or images to generate a comprehensive paper covering multiple chapters.
- **Official Answer Key**: Automatically generates a "Professor Logic" model answer for all questions (Theory and MCQ).
- **Responsive Dashboard**: Manage all your materials and history in a premium, glassmorphism UI.

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Bootstrap, Lucide Icons
- **Backend**: Node.js, Express, MongoDB
- **AI Service**: Python (FastAPI), Groq (Llama 3.3 70B & Llama 3.2 Vision)
- **OCR Engine**: PyMuPDF & Groq Vision
- **Storage**: Cloudinary

## 📦 Installation

1. **Clone the repo**:
   ```bash
   git clone <your-repo-url>
   ```

2. **Setup Backend**:
   - `cd server`
   - `npm install`
   - Add `.env` (MONGO_URI, JWT_SECRET, CLOUDINARY_URL)
   - `npm run dev`

3. **Setup AI Service**:
   - `cd ai_service`
   - `python -m venv venv`
   - `source venv/Scripts/activate`
   - `pip install -r requirements.txt`
   - Add `.env` (GROQ_API_KEY)
   - `python main.py`

4. **Setup Frontend**:
   - `cd client`
   - `npm install`
   - `npm run dev`

## 📄 License

MIT License
