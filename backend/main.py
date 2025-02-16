from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os
import boto3
from botocore.exceptions import ClientError
from mangum import Mangum


def get_openai_key():
    """Get OpenAI API key from AWS Parameter Store or local env"""
    # First try local environment variable
    local_key = os.getenv('OPENAI_API_KEY')
    if local_key:
        return local_key
        
    try:
        # If no local key, try AWS Parameter Store
        ssm = boto3.client('ssm')
        parameter_name = os.getenv('OPENAI_KEY_PARAMETER', '/persona-parley/OPENAI_API_KEY')
        response = ssm.get_parameter(Name=parameter_name, WithDecryption=True)
        return response['Parameter']['Value']
    except ClientError as e:
        print(f"Failed to get parameter from AWS: {e}")
        return None

app = FastAPI()

# Configure OpenAI
api_key = get_openai_key()
if not api_key:
    raise ValueError("OpenAI API key not found in environment or Parameter Store")
    
client = OpenAI(api_key=api_key)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.amplifyapp.com",  # This will allow any Amplify app domain
        os.getenv('FRONTEND_URL', ''),  # Optional: Add specific frontend URL from environment
        "https://6va7jv28x3.execute-api.us-east-1.amazonaws.com"  # Add API Gateway domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/")
def read_root():
    """Root endpoint providing API information"""
    return {
        "name": "Persona Parley API",
        "version": "1.0.0",
        "description": "An AI-powered debate platform with multiple personas",
        "endpoints": {
            "POST /personas": "Generate debate personas for a given question",
            "POST /ask_debate": "Get responses from selected personas",
            "POST /generate_suggestions": "Generate follow-up questions",
            "GET /check_api_key": "Verify API key configuration"
        },
        "status": "running"
    }

# Wrap FastAPI app with Mangum for AWS Lambda
lambda_handler = Mangum(app)

# Initialize empty personas list
PERSONAS = []

async def generate_personas(question: str):
    """Generate relevant personas for a given debate question"""
    system_prompt = """Given the debate question, generate 4 distinct and relevant personas that would provide valuable perspectives.
Each persona should have a characterful first name followed by their role (e.g., "Brian the Philosopher", "Sarah the Scientist").
You must return a valid JSON array containing exactly 4 objects. Each object must have these fields:
- 'id': lowercase hyphenated string (e.g., 'tech-expert')
- 'name': display name string (e.g., "Marcus the Tech Expert")
- 'description': brief description string

Example format:
[
    {
        "id": "tech-expert",
        "name": "Marcus the Tech Expert",
        "description": "Specialized in digital transformation and its societal impacts"
    },
    {
        "id": "ethics-prof",
        "name": "Elena the Ethics Professor",
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

@app.post("/generate_suggestions")
async def generate_suggestions(payload: QuestionPayload):
    """Generate suggested follow-up questions based on the conversation"""
    try:
        prompt = """Given the current debate topic, generate 5 thought-provoking follow-up questions that would deepen the discussion.
        Make questions concise and specific. Return only a JSON array of strings.
        Example: ["How does X impact Y?", "What role does Z play in this?"]"""
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Topic: {payload.question}"}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        import json
        suggestions = json.loads(response.choices[0].message.content)
        return suggestions
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

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
                    initial_system_message = f"""You are participating in a moderated debate as one of several personas.

                    Available personas (for context only):
                    """ + "\n".join([f"- {p['name']}: {p['description']}" for p in PERSONAS if p["id"] != "all"]) + """

                    CRITICAL RULES:
                    1. NEVER impersonate or speak as if you were another persona
                    2. NEVER introduce yourself or start with phrases like "As [name]" or "From my perspective"
                    3. Start DIRECTLY with your analysis or main point
                    4. Speak in first person from your perspective
                    5. You may reference previous points, but only after your own analysis
                    6. Stay focused on your specific domain expertise
                    7. Address your responses to the topic, not to other personas

                    REQUIRED RESPONSE FORMAT:
                    1. Start with a **bold thesis statement**
                    2. Organize content into sections with ### headers
                    3. Use bullet points (•) for key points
                    4. Use *italics* for emphasis
                    5. Include relevant emojis
                    6. End with a > quote for key takeaway

                    Example response structure:
                    **The core issue here revolves around...**

                    ### Primary Analysis
                    • First key insight with *emphasized concepts*
                    • Second important point that builds on the first

                    ### Broader Implications
                    This leads us to consider...

                    > 💡 Key takeaway: [concise summary]"""
                    
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
            
            # Return array of responses
            combined_response = {
                "responses": [
                    {
                        "persona": r["persona"],
                        "content": r["response"].replace(f"### {r['persona']['name']}\n\n", "").strip()
                    } for r in all_responses
                ]
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
            initial_system_message = f"""You are participating in a moderated debate as one of several personas.

            Available personas (for context only):
            """ + "\n".join([f"- {p['name']}: {p['description']}" for p in PERSONAS]) + """

            CRITICAL RULES:
            1. NEVER impersonate or speak as if you were another persona
            2. NEVER introduce yourself or start with phrases like "As [name]" or "From my perspective"
            3. Start DIRECTLY with your analysis or main point
            4. Speak in first person from your perspective
            5. You may reference previous points, but only after your own analysis
            6. Stay focused on your specific domain expertise
            7. Address your responses to the topic, not to other personas

            REQUIRED RESPONSE FORMAT:
            1. Start with a **bold thesis statement**
            2. Organize content into sections with ### headers
            3. Use bullet points (•) for key points
            4. Use *italics* for emphasis
            5. Include relevant emojis
            6. End with a > quote for key takeaway

            Example response structure:
            **The core issue here revolves around...**

            ### Primary Analysis
            • First key insight with *emphasized concepts*
            • Second important point that builds on the first

            ### Broader Implications
            This leads us to consider...

            > 💡 Key takeaway: [concise summary]"""
            
            messages.append({"role": "system", "content": initial_system_message})
        else:
            # For subsequent messages, just identify the current speaker
            messages.append({
                "role": "system", 
                "content": f"""You are {speaker['name']}. IMPORTANT: Only speak as yourself, never impersonate others. 
                Your expertise: {speaker['description']}.

                CRITICAL: Start DIRECTLY with your analysis. DO NOT introduce yourself or use phrases like "As [name]" or "From my perspective".

                Format your response using:
                • **Bold** for main arguments
                • ### Headers for sections
                • Bullet points for lists
                • *Italics* for emphasis
                • Relevant emojis
                • > for key takeaways

                Begin immediately with your main point or analysis."""
            })
        
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
