import os
import json
import httpx
import fitz  # PyMuPDF
import io
import base64
import pdfplumber
from typing import List
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import groq
from dotenv import load_dotenv

load_dotenv()

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import time
import asyncio
from groq import AsyncGroq

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY not found in environment variables!")

client = AsyncGroq(api_key=GROQ_API_KEY)

async def create_chat_completion_with_retry(*args, **kwargs):
    max_retries = 5
    delay = 2.0
    last_error = None
    for attempt in range(max_retries):
        try:
            return await client.chat.completions.create(*args, **kwargs)
        except groq.RateLimitError as e:
            last_error = e
            print(f"RateLimitError caught: {e}. Retrying in {delay} seconds (Attempt {attempt + 1}/{max_retries})...")
            await asyncio.sleep(delay)
            delay *= 2
        except Exception as e:
            # Check for other errors carrying a 429 status implicitly via string
            if "429" in str(e) or "rate limit" in str(e).lower():
                last_error = e
                print(f"429/Rate Limit error caught: {e}. Retrying in {delay} seconds (Attempt {attempt + 1}/{max_retries})...")
                await asyncio.sleep(delay)
                delay *= 2
            else:
                raise e
    print(f"Failed after {max_retries} attempts due to rate limit constraints.")
    if last_error:
        raise last_error
    raise Exception("Rate limit exceeded")


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------
class PaperGenerationRequest(BaseModel):
    material_text: str
    pattern: str
    difficulty: str
    total_marks: int
    mcq_count: int = 0
    theory_count: int = 0


class EvaluationRequest(BaseModel):
    """
    Accept a plain JSON body instead of form-encoded data.
    This avoids FastAPI's List[str] = Form() parsing bugs with URLSearchParams.
    """
    image_urls: List[str]
    paper_json: str  # JSON string of paper.questions array


class RawEvaluationRequest(BaseModel):
    """
    Used when the student uploads the question paper directly at evaluation time.
    The AI first reads/OCRs the question paper to extract questions,
    then evaluates the answer sheet images against those questions.
    """
    question_paper_urls: List[str]   # Images/PDF pages of the question paper
    answer_sheet_urls: List[str]     # Images of the student's handwritten answers
    total_marks: int = 100           # Total marks for the paper (user-provided)


# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------
@app.get("/")
def read_root():
    return {"status": "AI Service Running"}


# ---------------------------------------------------------------------------
# ENDPOINT 1: Extract text from a PDF or image URL
# FIX: Use httpx (async) instead of requests (sync/blocking)
# FIX: OCR threshold raised from 100 to 300 chars
# FIX: Batch OCR in groups of 5 pages (Groq Vision API limit)
# ---------------------------------------------------------------------------
@app.post("/extract-text-url")
@limiter.limit("20/minute")
async def extract_text_url(request: Request, body: dict):
    file_url = body.get("file_url")
    file_type = body.get("file_type")

    if not file_url:
        raise HTTPException(status_code=400, detail="file_url is required")

    try:
        async with httpx.AsyncClient(timeout=60.0) as http_client:
            response = await http_client.get(file_url)
            response.raise_for_status()
            content = response.content

        text = ""

        if file_type == "pdf":
            # Step 1: Try digital (text-layer) extraction — fast and clean
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"

            # MAX TEXT LIMIT for Digital Extraction (120k chars ~ 30k tokens)
            # If exceeded, we take chunks to keep context within Llama's window
            if len(text) > 120000:
                print(f"Digital text too large ({len(text)} chars). Truncating intelligently...")
                text = text[:60000] + "\n\n[... content truncated for brevity ...]\n\n" + text[-40000:]

            # Step 2: If not enough text (scanned/handwritten), fall back to Vision OCR
            if len(text.strip()) < 300:
                print("Digital extraction insufficient. Falling back to Vision OCR...")
                text = ""
                doc = fitz.open(stream=content, filetype="pdf")
                
                # Reduce limits to respect Groq Free Tier (15 pages max, to avoid 429 errors)
                page_count = min(len(doc), 15)
                all_page_images = []

                for i in range(page_count):
                    page = doc.load_page(i)
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                    img_bytes = pix.tobytes("jpeg")
                    encoded = base64.b64encode(img_bytes).decode("utf-8")
                    all_page_images.append(encoded)

                # Parallel Batch Processing: 5 pages per API call
                BATCH_SIZE = 5
                tasks = []

                import asyncio

                async def process_ocr_batch(batch, batch_start):
                    content_list = [
                        {
                            "type": "text",
                            "text": (
                                f"These are pages {batch_start + 1} to {batch_start + len(batch)} of a document. "
                                "Extract ALL text exactly as written. Return ONLY the extracted text."
                            ),
                        }
                    ]
                    for img_b64 in batch:
                        content_list.append(
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"},
                            }
                        )
                    
                    # Remove thread executor since we now use async client directly
                    res = await create_chat_completion_with_retry(
                        model="meta-llama/llama-4-scout-17b-16e-instruct",
                        messages=[{"role": "user", "content": content_list}],
                    )
                    return res.choices[0].message.content

                # Create all tasks for sequential execution to prevent 429 Rate Limits
                results = []
                for batch_start in range(0, len(all_page_images), BATCH_SIZE):
                    batch_slice = all_page_images[batch_start: batch_start + BATCH_SIZE]
                    print(f"Processing OCR batch starting at page {batch_start + 1}...")
                    try:
                        res_text = await process_ocr_batch(batch_slice, batch_start)
                        results.append(res_text)
                        await asyncio.sleep(2)
                    except Exception as e:
                        print(f"Batch OCR skipped due to limit: {e}")

                text = "\n\n".join(results)

        else:
            # Image file: Vision OCR directly
            encoded_image = base64.b64encode(content).decode("utf-8")
            res = await create_chat_completion_with_retry(
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": (
                                    "Extract ALL text from this image exactly as written. "
                                    "Preserve headings, bullet points, numbered lists, and paragraph structure. "
                                    "Return ONLY the extracted text."
                                ),
                            },
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{encoded_image}"},
                            },
                        ],
                    }
                ],
            )
            text = res.choices[0].message.content

        return {"text": text.strip()}

    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Failed to download file: {str(e)}")
    except groq.RateLimitError as e:
        # FastAPI might not natively map this, so explicitly return a 429
        raise HTTPException(status_code=429, detail=f"AI service token/rate limit exceeded: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# ENDPOINT 2: Generate a question paper from study material
# FIX: Theory answers must be 5-8 sentence detailed model answers
# FIX: MCQ options use A)/B)/C)/D) labels, correctAnswer = full option text
# ---------------------------------------------------------------------------
@app.post("/generate-paper")
@limiter.limit("20/minute")
async def generate_paper(request: Request, body: PaperGenerationRequest):
    print(f"--- GENERATION START ---")
    print(f"Material Length: {len(body.material_text)} chars")
    print(
        f"Config: {body.mcq_count} MCQs, {body.theory_count} Theory, "
        f"Difficulty: {body.difficulty}, Total Marks: {body.total_marks}"
    )

    prompt = f"""
You are an Expert University Professor and Subject Matter Expert.
Your task is to generate a high-quality, academically rigorous question paper
based ONLY on the core educational content provided below.

=== PAPER SPECIFICATIONS ===
- Difficulty Level : {body.difficulty}
- Total Target Marks: {body.total_marks}
- MCQ Questions     : {body.mcq_count}
- Theory Questions  : {body.theory_count}

=== STRICT RULES ===
1. IGNORE non-educational content: acknowledgments, prefaces, author bios, index pages, forewords.
2. FOCUS on chapters, technical concepts, definitions, mechanisms, algorithms, and examples.
3. Generate EXACTLY {body.mcq_count} MCQ questions and EXACTLY {body.theory_count} theory questions.
4. Set all "marks" fields to 0 (marks will be assigned manually later).

=== DIFFICULTY GUIDELINES ===
- Beginner: Definitions, basic concepts, fill-in-the-blank style theory.
- Intermediate: Application, scenario-based, comparison between concepts.
- Advance: Deep analysis, synthesis, case studies, architectural design questions.

=== MCQ FORMAT RULES ===

- The "correctAnswer" field MUST be the FULL option string (e.g., "A) Binary Search Tree")
- Options must be meaningfully distinct.

=== THEORY FORMAT RULES ===
- Every theory "correctAnswer" MUST be a DETAILED MODEL ANSWER of at least 5 to 8 sentences.
- It MUST include:
    a) A clear definition or opening statement
    b) The working mechanism or key steps
    c) A real-world example or use case
    d) Advantages or disadvantages where applicable
    e) A closing remark or conclusion
- ONE-LINE ANSWERS ARE STRICTLY FORBIDDEN for theory questions.
- Answer should be logically related to question.

=== REQUIRED JSON OUTPUT FORMAT ===
Return ONLY a valid JSON object in this exact format:
{{
    "questions": [
        {{
            "questionText": "Write the full question here?",
            "questionType": "mcq",
            "options": ["A) Option one", "B) Option two", "C) Option three", "D) Option four"],
            "correctAnswer": "A) Option one",
            "marks": 0
        }},
        {{
            "questionText": "Write the full theory question here?",
            "questionType": "theory",
            "options": [],
            "correctAnswer": "Detailed model answer of 5-8 sentences covering definition, mechanism, example, advantages, and conclusion.",
            "marks": 0
        }}
    ]
}}

=== STUDY MATERIAL ===
{body.material_text[:14000]}
"""

    try:
        print("Calling Groq API for paper generation...")
        completion = await create_chat_completion_with_retry(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.4,
            max_tokens=2500,
        )
        print("Generation Successful!")
        return completion.choices[0].message.content

    except Exception as e:
        print(f"!!! GENERATION ERROR: {str(e)}")

        error_str = str(e).lower()
        if any(msg in error_str for msg in ["rate_limit", "context_length", "limit_reached", "too large", "413", "429"]):
            print("Retrying with smaller context (15,000 chars) and fallback model...")
            base_prompt = prompt.split("=== STUDY MATERIAL ===")[0]
            prompt_fallback = f"{base_prompt}=== STUDY MATERIAL ===\n{body.material_text[:15000]}"
            try:
                completion = await create_chat_completion_with_retry(
                    model="llama-3.1-8b-instant",
                    messages=[{"role": "user", "content": prompt_fallback}],
                    response_format={"type": "json_object"},
                    temperature=0.4,
                    max_tokens=2500,
                )
                return completion.choices[0].message.content
            except Exception as e2:
                print(f"!!! FALLBACK ERROR: {str(e2)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Generation failed after fallback: {str(e2)}",
                )

        if isinstance(e, groq.RateLimitError):
            raise HTTPException(status_code=429, detail=str(e))

        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# ENDPOINT 3: Evaluate a student's solved paper from images
# ROOT CAUSE FIX: Changed from Form() to JSON body (EvaluationRequest model)
#   - URLSearchParams + List[str] = Form() was the cause of the 500 error
#   - FastAPI parses JSON body natively and reliably
# FIX: base64-encode images — Groq Vision can't reliably fetch Cloudinary URLs
# FIX: pass per-question marks to the AI so scoring is accurate, not guessed
# ---------------------------------------------------------------------------
@app.post("/evaluate-submission")
@limiter.limit("20/minute")
async def evaluate_submission(request: Request, body: EvaluationRequest):
    # Parse questions
    try:
        questions = json.loads(body.paper_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid paper_json — must be valid JSON")

    if not isinstance(questions, list) or len(questions) == 0:
        raise HTTPException(status_code=400, detail="paper_json must be a non-empty array of questions")

    # Build a mark-aware question summary for the prompt
    question_summary = ""
    total_max_marks = 0
    for i, q in enumerate(questions):
        qtype = q.get("questionType", "theory")
        marks = q.get("marks", 0)
        total_max_marks += marks
        question_summary += (
            f"\nQ{i + 1} [{qtype.upper()}] (Max Marks: {marks})\n"
            f"  Question : {q.get('questionText', '')}\n"
            f"  Correct  : {q.get('correctAnswer', '')}\n"
        )

    prompt = f"""
You are a strict but fair university examiner evaluating a student's handwritten solved paper.

=== ORIGINAL PAPER QUESTIONS AND CORRECT ANSWERS ===
{question_summary}

Total Maximum Marks: {total_max_marks}

=== YOUR EVALUATION TASK ===
The images provided are scanned pages of the student's handwritten answers.

For EACH question (Q1, Q2, ... in order):
1. OCR: Read the student's handwritten answer from the image carefully.
2. Compare: Compare their answer against the correct answer provided above. if user has written something different in their own wording but the meaning is same as the correct answer or it is an another valid way to express the same thing , or if user has written some extra ordinary which our pdf dont have the  carefully check it and give fair marks.
3. Score:
   - For MCQ: Full marks if correct, 0 if wrong. No partial marks.
   - For Theory: Award partial marks proportionally:
       * Correct definition or opening: 25 percent of marks
       * Correct mechanism or working: 35 percent of marks
       * Relevant example: 20 percent of marks
       * Conclusion or completeness: 20 percent of marks
4. Feedback: Write 2 to 3 sentences of constructive feedback.
5. Always include the correctAnswer field for every question.

=== REQUIRED JSON OUTPUT ===
Return only a valid JSON object in this exact format:
{{
    "totalScore": 0,
    "maxScore": {total_max_marks},
    "feedback": [
        {{
            "questionIndex": 0,
            "studentAnswer": "what the student wrote",
            "obtainedMarks": 0,
            "aiFeedback": "2-3 sentence constructive feedback here.",
            "isCorrect": false,
            "correctAnswer": "full correct answer here"
        }}
    ],
    "overallComment": "2-3 sentence overall performance summary."
}}
Note: totalScore must equal the sum of all obtainedMarks values.
Note: no obtainedMarks value may exceed the question's Max Marks.
"""

    # Download images and encode as base64 — Groq Vision cannot fetch Cloudinary URLs
    content: list = [{"type": "text", "text": prompt}]
    async with httpx.AsyncClient(timeout=60.0) as http_client:
        for url in body.image_urls:
            try:
                img_response = await http_client.get(url)
                img_response.raise_for_status()
                encoded = base64.b64encode(img_response.content).decode("utf-8")
                # Strip charset params from content-type (e.g. "image/jpeg; charset=utf-8")
                content_type = img_response.headers.get("content-type", "image/jpeg").split(";")[0].strip()
                content.append(
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{content_type};base64,{encoded}"},
                    }
                )
                print(f"Loaded image successfully: {url[:80]}...")
            except Exception as img_err:
                print(f"WARNING: Could not load image {url}: {img_err}")

    if len(content) == 1:
        # Only the text prompt, zero images loaded
        raise HTTPException(
            status_code=422,
            detail="No images could be loaded from the provided URLs. Check that the URLs are publicly accessible."
        )

    try:
        print(f"Calling Groq Vision with {len(content) - 1} image(s)...")
        completion = await create_chat_completion_with_retry(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": content}],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=4000,
        )
        print("Evaluation Successful!")
        return completion.choices[0].message.content
    except Exception as e:
        print(f"!!! EVALUATION ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# ENDPOINT 4: Evaluate directly from uploaded question paper + answer sheet
# No saved paper in DB needed — user uploads BOTH at evaluation time.
# Step 1: OCR the question paper to extract questions and marks.
# Step 2: Re-use those extracted questions to evaluate the answer sheet.
# ---------------------------------------------------------------------------
@app.post("/evaluate-raw")
@limiter.limit("20/minute")
async def evaluate_raw(request: Request, body: RawEvaluationRequest):
    if not body.question_paper_urls:
        raise HTTPException(status_code=400, detail="question_paper_urls is required")
    if not body.answer_sheet_urls:
        raise HTTPException(status_code=400, detail="answer_sheet_urls is required")

    print(f"--- RAW EVALUATION START ---")
    print(f"Question Paper pages: {len(body.question_paper_urls)}")
    print(f"Answer Sheet pages  : {len(body.answer_sheet_urls)}")

    # -----------------------------------------------------------------------
    # STEP 1: Download + base64-encode the question paper images
    # -----------------------------------------------------------------------
    async def download_as_base64(urls: List[str], http_client: httpx.AsyncClient):
        """Download a list of image URLs and return base64 data URIs."""
        result = []
        for url in urls:
            try:
                r = await http_client.get(url)
                r.raise_for_status()
                encoded = base64.b64encode(r.content).decode("utf-8")
                ctype = r.headers.get("content-type", "image/jpeg").split(";")[0].strip()
                result.append({"data_uri": f"data:{ctype};base64,{encoded}", "url": url})
                print(f"  Loaded: {url[:70]}...")
            except Exception as e:
                print(f"  WARNING: Could not load {url}: {e}")
        return result

    async with httpx.AsyncClient(timeout=60.0) as http:
        print("Downloading question paper images...")
        qp_images = await download_as_base64(body.question_paper_urls, http)
        print("Downloading answer sheet images...")
        ans_images = await download_as_base64(body.answer_sheet_urls, http)

    if not qp_images:
        raise HTTPException(status_code=422, detail="No question paper images could be loaded")
    if not ans_images:
        raise HTTPException(status_code=422, detail="No answer sheet images could be loaded")

    # -----------------------------------------------------------------------
    # STEP 2: OCR the question paper → extract structured questions
    # -----------------------------------------------------------------------
    qp_extraction_prompt = f"""
You are an expert OCR system. The images provided are pages of a printed question paper.

Your task:
1. Read every question carefully.
2. Extract each question with its question number, type (MCQ or Theory/Subjective), and marks.
3. For Theory: just the question text is enough.
4. Total marks of the paper: {body.total_marks}
Return ONLY a valid JSON object:
{{
    "questions": [
        {{
            "questionNumber": 1,
            "questionText": "full question text here",
            "questionType": "mcq or theory",
            "marks": 5
        }}
    ]
}}

Rules:
- If marks are not printed on the paper, distribute {body.total_marks} total marks equally.
- questionType must be exactly "mcq" or "theory".
- options array is empty [] for theory questions.
"""

    qp_content = [{"type": "text", "text": qp_extraction_prompt}]
    for img in qp_images:
        qp_content.append({"type": "image_url", "image_url": {"url": img["data_uri"]}})

    try:
        print("Step 1: Extracting questions from question paper via Vision OCR...")
        qp_completion = await create_chat_completion_with_retry(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": qp_content}],
            response_format={"type": "json_object"},
            temperature=0.1,   # Very low — we want exact extraction, not creativity
            max_tokens=4000,
        )
        extracted_raw = qp_completion.choices[0].message.content
        extracted = json.loads(extracted_raw)
        questions = extracted.get("questions", [])
        print(f"  Extracted {len(questions)} question(s) from question paper.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Question paper extraction failed: {str(e)}")

    if not questions:
        raise HTTPException(
            status_code=422,
            detail="Could not extract any questions from the question paper. Make sure the image is clear and readable."
        )

    # -----------------------------------------------------------------------
    # STEP 3: Evaluate the answer sheet against the extracted questions
    # -----------------------------------------------------------------------
    total_max_marks = sum(q.get("marks", 0) for q in questions)
    # If all marks are 0 (couldn't extract), distribute equally
    if total_max_marks == 0:
        per_q = round(body.total_marks / len(questions))
        for q in questions:
            q["marks"] = per_q
        total_max_marks = body.total_marks

    question_summary = ""
    for i, q in enumerate(questions):
        qtype = q.get("questionType", "theory")
        marks = q.get("marks", 0)
        opts = "\n    ".join(q.get("options", []))
        question_summary += (
            f"\nQ{i + 1} [{qtype.upper()}] (Max Marks: {marks})\n"
            f"  Question: {q.get('questionText', '')}\n"
        )
        if opts:
            question_summary += f"  Options:\n    {opts}\n"

    eval_prompt = f"""
You are a strict but fair university examiner evaluating a student's handwritten answer sheet.

=== QUESTION PAPER (already extracted) ===
{question_summary}

Total Maximum Marks: {total_max_marks}

=== YOUR TASK ===
The images provided are the student's handwritten answer sheet pages.

For EACH question in order:
1. OCR: Read the student's handwritten answer from the image.
2. Compare their answer against what is being asked.
3. Score:
   - MCQ: Full marks if correct, 0 if wrong.
   - Theory: Partial marks based on:
       * Definition / opening: 25 percent
       * Mechanism / working: 35 percent
       * Example: 20 percent
       * Conclusion / completeness: 20 percent
4. Write 2-3 sentences of constructive feedback.
5. For MCQ: state which option was correct. For Theory: provide a brief model answer.

=== REQUIRED JSON OUTPUT ===
{{
    "totalScore": 0,
    "maxScore": {total_max_marks},
    "feedback": [
        {{
            "questionIndex": 0,
            "studentAnswer": "what the student wrote",
            "obtainedMarks": 0,
            "aiFeedback": "2-3 sentence feedback.",
            "isCorrect": false,
            "correctAnswer": "correct answer or model answer here"
        }}
    ],
    "overallComment": "2-3 sentence overall performance summary."
}}
Note: totalScore must equal the sum of all obtainedMarks. No obtainedMarks may exceed its question Max Marks.
"""

    ans_content = [{"type": "text", "text": eval_prompt}]
    for img in ans_images:
        ans_content.append({"type": "image_url", "image_url": {"url": img["data_uri"]}})

    try:
        print("Step 2: Evaluating answer sheet against extracted questions...")
        eval_completion = await create_chat_completion_with_retry(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": ans_content}],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=4000,
        )
        eval_result_raw = eval_completion.choices[0].message.content
        eval_result = json.loads(eval_result_raw)
        print("Raw Evaluation Successful!")

        # Return both the extracted questions AND the evaluation result
        return {
            "extractedQuestions": questions,
            "evaluation": eval_result,
            "totalMaxMarks": total_max_marks
        }
    except Exception as e:
        print(f"!!! RAW EVALUATION ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Answer evaluation failed: {str(e)}")

