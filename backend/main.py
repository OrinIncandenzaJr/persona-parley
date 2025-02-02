from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os

app = FastAPI()

# Configure OpenAI
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
if not client.api_key:
    raise ValueError("OPENAI_API_KEY environment variable is not set")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Initialize empty personas list
PERSONAS = []

async def generate_personas(question: str):
    """Generate relevant personas for a given debate question"""
    system_prompt = """Given the debate question, generate 4 distinct and relevant personas that would provide valuable perspectives.
    You must return a valid JSON array containing exactly 4 objects. Each object must have these fields:
    - 'id': lowercase hyphenated string (e.g., 'tech-expert')
    - 'name': display name string
    - 'description': brief description string
    
    Example format:
    [
        {
            "id": "tech-expert",
            "name": "Technology Expert",
            "description": "Specialized in digital transformation and its societal impacts"
        },
        {
            "id": "ethics-prof",
            "name": "Ethics Professor",
            "description": "Expert in moral philosophy and societal implications"
        }
    ]
    
    Return ONLY the JSON array, no other text or explanation."""
    
    example_format = """Example format:
    [
        {
            "id": "tech-expert",
            "name": "Technology Expert",
            "description": "Specialized in digital transformation and its societal impacts"
        }
    ]"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt + "\n" + example_format},
                {"role": "user", "content": f"Generate 4 relevant personas for this debate question: {question}"}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        try:
            # Parse the response and update PERSONAS
            import json
            generated_personas = json.loads(response.choices[0].message.content)
            
            # Ensure generated_personas is a list
            if not isinstance(generated_personas, list):
                raise ValueError("Generated personas must be an array")
            
            # Validate each persona has required fields
            for persona in generated_personas:
                if not all(key in persona for key in ['id', 'name', 'description']):
                    raise ValueError("Each persona must have id, name, and description")
            
            # Clear existing personas and add new ones
            PERSONAS.clear()
            # Add the "All" persona first
            PERSONAS.append({
                "id": "all",
                "name": "All",
                "description": "Get responses from all personas"
            })
            # Add the generated personas
            PERSONAS.extend(generated_personas)
            
            return PERSONAS
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=500, detail=f"Invalid JSON from AI response: {str(e)}")
        except ValueError as e:
            raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate personas: {str(e)}")

class DebateMessage(BaseModel):
    persona: str
    content: str

class DebatePayload(BaseModel):
    new_message: str
    speaker_id: str = Field(..., description="ID of the persona to speak next")
    conversation_history: List[DebateMessage]

@app.get("/check_api_key")
async def check_api_key():
    """Debug endpoint to check if API key is set"""
    return {"api_key_set": bool(client.api_key)}

class QuestionPayload(BaseModel):
    question: str

@app.post("/personas")
async def get_personas(payload: QuestionPayload) -> List[dict]:
    """Generate and return list of personas relevant to the question"""
    return await generate_personas(payload.question)

@app.post("/ask_debate")
async def ask_debate(payload: DebatePayload):
    try:
        if payload.speaker_id == "all":
            # Handle all personas case
            all_responses = []
            for persona in [p for p in PERSONAS if p["id"] != "all"]:
                messages = []
                
                if not payload.conversation_history:
                    initial_system_message = f"""You are participating in a moderated debate. You will ONLY ever speak as your assigned role.
                    
                    Available personas (for context only):
                    """ + "\n".join([f"- {p['name']}: {p['description']}" for p in PERSONAS if p["id"] != "all"]) + """
                    
                    CRITICAL RULES:
                    1. NEVER impersonate or speak as if you were another persona
                    2. NEVER start your response with another persona's name
                    3. ALWAYS begin with your own direct analysis
                    4. Speak in first person from your perspective
                    5. You may reference previous points, but only after your own analysis
                    6. Stay focused on your specific domain expertise
                    7. Address your responses to the topic, not to other personas"""
                    
                    messages.append({"role": "system", "content": initial_system_message})
                else:
                    messages.append({"role": "system", "content": f"You are {persona['name']}. IMPORTANT: Only speak as yourself, never impersonate others. Your expertise: {persona['description']}. Begin with 'As a {persona['name']}' or 'From my perspective' and provide your direct analysis."})
                
                for msg in payload.conversation_history:
                    role = "assistant" if msg.persona != "Moderator" else "user"
                    messages.append({"role": role, "content": f"{msg.persona}: {msg.content}"})
                
                messages.append({"role": "user", "content": payload.new_message})
                
                response = client.chat.completions.create(
                    model="gpt-4",
                    messages=messages,
                    temperature=0.7,
                    max_tokens=1000
                )
                
                all_responses.append({
                    "response": f"### {persona['name']}\n\n{response.choices[0].message.content if response.choices else 'No response generated'}\n\n",
                    "persona": persona
                })
            
            # Combine all responses with proper formatting
            combined_response = {
                "response": "".join(r["response"] for r in all_responses),
                "persona": {"id": "all", "name": "All", "description": "Combined response from all personas"}
            }
            return combined_response
            
        # Handle single persona case
        speaker = next((p for p in PERSONAS if p["id"] == payload.speaker_id), None)
        if not speaker:
            raise HTTPException(status_code=400, detail="Invalid persona ID")
        
        # Prepare messages array
        messages = []
        
        if not payload.conversation_history:
            # If this is the first message, set up the full debate context
            initial_system_message = f"""You are participating in a moderated debate. You will ONLY ever speak as your assigned role.

            Available personas (for context only):
            """ + "\n".join([f"- {p['name']}: {p['description']}" for p in PERSONAS]) + """

            CRITICAL RULES:
            1. NEVER impersonate or speak as if you were another persona
            2. NEVER start your response with another persona's name
            3. ALWAYS begin with your own direct analysis
            4. Speak in first person from your perspective
            5. You may reference previous points, but only after your own analysis
            6. Stay focused on your specific domain expertise
            7. Address your responses to the topic, not to other personas"""
            
            messages.append({"role": "system", "content": initial_system_message})
        else:
            # For subsequent messages, just identify the current speaker
            messages.append({"role": "system", "content": f"You are {speaker['name']}. IMPORTANT: Only speak as yourself, never impersonate others. Your expertise: {speaker['description']}. Begin with 'As a {speaker['name']}' or 'From my perspective' and provide your direct analysis."})
        
        # Add conversation history
        for msg in payload.conversation_history:
            role = "assistant" if msg.persona != "Moderator" else "user"
            messages.append({"role": role, "content": f"{msg.persona}: {msg.content}"})
        
        # Add the new message
        messages.append({"role": "user", "content": payload.new_message})

        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0.7,
            max_tokens=1000
        )

        return {
            "response": response.choices[0].message.content if response.choices else "No response generated",
            "persona": speaker
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
