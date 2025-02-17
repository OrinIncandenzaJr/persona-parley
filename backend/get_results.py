import json
import boto3
import os

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ.get("DYNAMODB_TABLE", "openai-results"))

def lambda_handler(event, context):
    message_id = event["pathParameters"].get("message_id")
    
    result = table.get_item(Key={"message_id": message_id})
    
    if "Item" not in result:
        return {
            "statusCode": 404,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"error": "Result not found"})
        }
    
    item = result["Item"]
    if item["status"] == "error":
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"error": item["error"]})
        }
    
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": item["response"]
    }
