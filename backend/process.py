import json
import os
import openai
import boto3
from openai import OpenAI

# Initialize DynamoDB and OpenAI clients
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ.get("DYNAMODB_TABLE", "openai-results"))
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def lambda_handler(event, context):
    for record in event["Records"]:
        message_id = record["messageId"]
        body = json.loads(record["body"])
        
        try:
            # Extract request details from SQS message
            request_type = body.get("request_type")
            if request_type == "debate":
                response = process_debate_request(body)
            elif request_type == "personas":
                response = process_personas_request(body)
            elif request_type == "suggestions":
                response = process_suggestions_request(body)
            else:
                raise ValueError(f"Unknown request type: {request_type}")

            # Store result in DynamoDB
            table.put_item(
                Item={
                    "message_id": message_id,
                    "status": "completed",
                    "response": json.dumps(response),
                    "request_type": request_type
                }
            )
            
        except Exception as e:
            # Store error in DynamoDB
            table.put_item(
                Item={
                    "message_id": message_id,
                    "status": "error",
                    "error": str(e),
                    "request_type": body.get("request_type")
                }
            )
            raise e

def process_debate_request(body):
    messages = body.get("messages", [])
    response = client.chat.completions.create(
        model="gpt-4",
        messages=messages,
        temperature=0.7,
        max_tokens=1000
    )
    return {
        "response": response.choices[0].message.content if response.choices else "No response generated",
        "persona": body.get("persona")
    }

def process_personas_request(body):
    question = body.get("question")
    system_prompt = body.get("system_prompt")
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Generate 4 relevant personas for this debate question: {question}"}
        ],
        temperature=0.7,
        max_tokens=500
    )
    return json.loads(response.choices[0].message.content)

def process_suggestions_request(body):
    question = body.get("question")
    prompt = body.get("prompt")
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"Topic: {question}"}
        ],
        temperature=0.7,
        max_tokens=500
    )
    return json.loads(response.choices[0].message.content)
