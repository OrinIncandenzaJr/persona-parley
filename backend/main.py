from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os
import boto3
from botocore.exceptions import ClientError
import uuid
from mangum import Mangum
import json
import sys
import openai
import httpx

print("Python path inside Lambda:", sys.path)
print("OpenAI version inside Lambda:", openai.__version__)
print("httpx version inside Lambda:", httpx.__version__)


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
    
client = OpenAI(api_key=api_key, http_client=None)

# Initialize SQS client
sqs = boto3.client('sqs')
QUEUE_URL = os.environ.get('SQS_QUEUE_URL')

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://main.d1wv9cggx4trj9.amplifyapp.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["Content-Type"]
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
def lambda_handler(event, context):
    print("Received event:", json.dumps(event, indent=2))
    mangum_handler = Mangum(app)
    return mangum_handler(event, context)

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
    """Enqueue suggestion generation request to SQS"""
    try:
        # Generate unique message ID
        message_id = str(uuid.uuid4())
        
        # Prepare message for SQS
        message = {
            "request_type": "suggestions",
            "question": payload.question,
            "prompt": """Given the current debate topic, generate 5 thought-provoking follow-up questions that would deepen the discussion.
        Make questions concise and specific. Return only a JSON array of strings.
        Example: ["How does X impact Y?", "What role does Z play in this?"]"""
        }
        
        # Send to SQS
        response = sqs.send_message(
            QueueUrl=QUEUE_URL,
            MessageBody=json.dumps(message),
            MessageAttributes={
                'MessageId': {
                    'DataType': 'String',
                    'StringValue': message_id
                }
            }
        )
        
        return {
            "message": "Request accepted for processing",
            "message_id": message_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

@app.post("/personas")
async def get_personas(payload: QuestionPayload) -> dict:
    """Enqueue persona generation request to SQS"""
    print(f"Received question: {payload.question}")
    try:
        # Generate unique message ID
        message_id = str(uuid.uuid4())
        
        # Prepare message for SQS
        message = {
            "request_type": "personas",
            "question": payload.question,
            "system_prompt": """Given the debate question, generate 4 distinct and relevant personas that would provide valuable perspectives.
Each persona should have a characterful first name followed by their role (e.g., "Brian the Philosopher", "Sarah the Scientist").
You must return a valid JSON array containing exactly 4 objects. Each object must have these fields:
- 'id': lowercase hyphenated string (e.g., 'tech-expert')
- 'name': display name string (e.g., "Marcus the Tech Expert")
- 'description': brief description string"""
        }
        
        # Send to SQS
        response = sqs.send_message(
            QueueUrl=QUEUE_URL,
            MessageBody=json.dumps(message),
            MessageAttributes={
                'MessageId': {
                    'DataType': 'String',
                    'StringValue': message_id
                }
            }
        )
        
        return {
            "message": "Request accepted for processing",
            "message_id": message_id
        }
        
    except Exception as e:
        print(f"Error enqueueing persona request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ask_debate")
async def ask_debate(payload: DebatePayload):
    print("Received ask_debate payload:", payload)
    try:
        # Generate unique message ID
        message_id = str(uuid.uuid4())
        
        # Prepare message for SQS
        message = {
            "request_type": "debate",
            "speaker_id": payload.speaker_id,
            "new_message": payload.new_message,
            "conversation_history": [msg.dict() for msg in payload.conversation_history]
        }
        
        # Send to SQS
        response = sqs.send_message(
            QueueUrl=QUEUE_URL,
            MessageBody=json.dumps(message),
            MessageAttributes={
                'MessageId': {
                    'DataType': 'String',
                    'StringValue': message_id
                }
            }
        )
        
        return {
            "message": "Request accepted for processing",
            "message_id": message_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
