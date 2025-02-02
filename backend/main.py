from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
import openai
import os

app = FastAPI()

# Configure OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')
if not openai.api_key:
    raise ValueError("OPENAI_API_KEY environment variable is not set")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Predefined personas
PERSONAS = [
    {
        "id": "blue-collar",
        "name": "Blue Collar Worker",
        "description": "Practical, hands-on perspective focused on labor, wages, and working conditions"
    },
    {
        "id": "economist",
        "name": "Balanced Economist",
        "description": "Data-driven analysis of economic policies and market dynamics"
    },
    {
        "id": "futurist",
        "name": "Tech Futurist",
        "description": "Forward-thinking perspective on technology's impact on society"
    },
    {
        "id": "white-collar",
        "name": "White Collar Worker",
        "description": "Corporate and professional workplace perspective"
    }
]

class Question(BaseModel):
    question: str
    persona_id: str = Field(..., description="ID of the persona to respond")

@app.get("/check_api_key")
async def check_api_key():
    """Debug endpoint to check if API key is set"""
    return {"api_key_set": bool(openai.api_key)}

@app.get("/personas")
async def get_personas() -> List[dict]:
    """Return list of available personas"""
    return PERSONAS

@app.post("/ask_debate")
async def ask_debate(question: Question):
    if not question.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    # Validate persona exists
    persona = next((p for p in PERSONAS if p["id"] == question.persona_id), None)
    if not persona:
        raise HTTPException(status_code=400, detail="Invalid persona ID")
    
    try:
        # Create system message with persona context
        system_message = f"""You are a {persona['name']}. 
        Your perspective: {persona['description']}
        Respond to questions maintaining this viewpoint consistently."""

        # Call OpenAI API
        response = await openai.ChatCompletion.acreate(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": question.question}
            ],
            temperature=0.7,
            max_tokens=500
        )

        return {
            "response": response.choices[0].message.content,
            "persona": persona
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
