import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import groq
import pdfplumber
import io
import base64
from typing import List
from pydantic import BaseModel
from dotenv import load_dotenv
import requests
import fitz  # PyMuPDF

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY not found in environment variables!")

client = groq.Groq(api_key=GROQ_API_KEY)

class PaperGenerationRequest(BaseModel):
    material_text: str
    pattern: str
    difficulty: str
    total_marks: int
    mcq_count: int = 0
    theory_count: int = 0

@app.get("/")
def read_root():
    return {"status": "AI Service Running"}

@app.post("/extract-text-url")
async def extract_text_url(request: dict):
    file_url = request.get("file_url")
    file_type = request.get("file_type")
    
    try:
        response = requests.get(file_url)
        content = response.content
        text = ""
        
        if file_type == 'pdf':
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() or ""
            
            # OCR FALLBACK: If digital extraction failed (e.g. handwritten/scanned)
            if len(text.strip()) < 100:
                print("Digital extraction failed or returned minimal text. Falling back to OCR...")
                text = "" # Reset and start OCR
                doc = fitz.open(stream=content, filetype="pdf")
                
                all_page_images = []
                # Limit to first 30 pages to avoid API limits/time
                for i in range(min(len(doc), 30)):
                    page = doc.load_page(i)
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2)) # Zoom for better OCR
                    img_bytes = pix.tobytes("jpeg")
                    encoded = base64.b64encode(img_bytes).decode('utf-8')
                    all_page_images.append(encoded)
                
                # Call Groq Vision for OCR
                content_list = [{"type": "text", "text": "Extract all text from these handwritten or scanned pages accurately. Return only the extracted text."}]
                for img_b64 in all_page_images:
                    content_list.append({
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}
                    })
                
                res = client.chat.completions.create(
                    model="llama-3.2-11b-vision-preview",
                    messages=[{"role": "user", "content": content_list}],
                )
                text = res.choices[0].message.content
        else:
            # For images, we use Vison OCR even for extraction
            encoded_image = base64.b64encode(content).decode('utf-8')
            prompt = "Extract all text from this image accurately."
            res = client.chat.completions.create(
                model="llama-3.2-11b-vision-preview",
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encoded_image}"}}
                    ]
                }],
            )
            text = res.choices[0].message.content
            
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-paper")
async def generate_paper(request: PaperGenerationRequest):
    print(f"--- GENERATION START ---")
    print(f"Material Length: {len(request.material_text)} chars")
    print(f"Config: {request.mcq_count} MCQs, {request.theory_count} Theory, Difficulty: {request.difficulty}")
    
    prompt = f"""
    You are an Expert University Professor and Subject Matter Expert. 
    Your task is to generate a high-quality, academically rigorous question paper based ONLY on the core educational content provided.
    
    ### CRITICAL INSTRUCTIONS:
    1. **IGNORE NON-EDUCATIONAL CONTENT**: Strictly ignore any acknowledgments, prefaces, author biographies, index pages, forewords, or introductory fluff.
    2. **FOCUS ON CHAPTERS**: Dive deep into the actual chapters, technical concepts, implementation details, and theoretical foundations.
    3. **THINK LIKE A PROFESSOR**: Prioritize conceptual understanding, critical thinking, and problem-solving over simple definitions.
    
    ### PAPER SPECIFICATIONS:
    - **Difficulty Level**: {request.difficulty}
    - **Total Target Marks**: {request.total_marks}
    - **MCQ Count**: {request.mcq_count}
    - **Theory/Subjective Count**: {request.theory_count}
    
    ### RULES:
    1. STRICTLY generate exactly {request.mcq_count} Multiple Choice Questions.
    2. STRICTLY generate exactly {request.theory_count} Theory/Subjective Questions.
    3. For {request.difficulty} difficulty:
       - Beginner: Direct, fundamental concepts.
       - Intermediate: Conceptual application and scenario-based.
       - Advance: Deep analysis, synthesis, and complex problem-solving.
    4. Set all "marks" fields to 0 (marks will be assigned manually by the user later).
    
    Return the response strictly in JSON format:
    {{
        "questions": [
            {{
                "questionText": "...",
                "questionType": "mcq" or "theory",
                "options": ["...", "..."], // only for mcq
                "correctAnswer": "...", // For MCQ it is the correct option (A, B, C etc). For Theory it is a DETAILED Professor's Model Answer.
                "marks": 0
            }}
        ]
    }}
    
    ### STUDY MATERIAL:
    {request.material_text[:50000]}
    """
    
    try:
        print("Calling Groq API...")
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        print("Generation Successful!")
        return completion.choices[0].message.content
    except Exception as e:
        print(f"!!! GENERATION ERROR !!!: {str(e)}")
        # If it's a context length issue, try with a smaller chunk as fallback
        if any(msg in str(e).lower() for msg in ["rate_limit", "context_length", "limit_reached"]):
            print("Fallback to smaller context...")
            # Get the base prompt without the study material
            base_prompt = prompt.split("### STUDY MATERIAL:")[0]
            prompt_fallback = f"{base_prompt}### STUDY MATERIAL:\n{request.material_text[:20000]}"
            try:
                completion = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": prompt_fallback}],
                    response_format={"type": "json_object"}
                )
                return completion.choices[0].message.content
            except Exception as e2:
                raise HTTPException(status_code=500, detail=f"Generation failed after fallback: {str(e2)}")
        
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/evaluate-submission")
async def evaluate_submission(
    image_urls: List[str] = Form(...),
    paper_json: str = Form(...)
):
    # This will handle multi-image OCR and evaluation using Llama 3 Vision
    # paper_json contains the original questions and answers
    
    prompt = f"""
    You are an expert examiner. Above are images of a student's handwritten solved paper.
    Original Paper Structure:
    {paper_json}
    
    Evaluate the student's answers based on the images provided.
    For each question:
    1. Extract the student's answer using OCR.
    2. Compare it with the correct answer.
    3. Assign marks based on accuracy.
    4. Provide constructive feedback and show the correct answer if their answer is wrong.
    
    Return a JSON object:
    {{
        "totalScore": 25,
        "maxScore": 50,
        "feedback": [
            {{
                "questionIndex": 0,
                "obtainedMarks": 5,
                "aiFeedback": "Excellent explanation.",
                "isCorrect": true,
                "correctAnswer": "..."
            }}
        ],
        "overallComment": "Well done!"
    }}
    """
    
    # In a real implementation, we would iterate over image_urls and send to Vision model
    # For now, I'll provide the structured logic for Groq Vision
    
    content = [{"type": "text", "text": prompt}]
    for url in image_urls:
        content.append({
            "type": "image_url",
            "image_url": {"url": url}
        })

    try:
        completion = client.chat.completions.create(
            model="llama-3.2-11b-vision-preview",
            messages=[{"role": "user", "content": content}],
            response_format={"type": "json_object"}
        )
        return completion.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
