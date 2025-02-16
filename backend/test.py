# from main import lambda_handler  # or main.handler if you haven't renamed it

# event = {
#     "resource": "/{proxy+}",
#     "path": "/",
#     "httpMethod": "GET",
#     "headers": {
#         "Accept": "*/*",
#         "Host": "test.execute-api.us-east-1.amazonaws.com",
#         "User-Agent": "curl/7.64.1"
#     },
#     "multiValueHeaders": {
#         "Accept": ["*/*"],
#         "Host": ["test.execute-api.us-east-1.amazonaws.com"],
#         "User-Agent": ["curl/7.64.1"]
#     },
#     "queryStringParameters": {},
#     "multiValueQueryStringParameters": {},
#     "pathParameters": {"proxy": "/"},
#     "stageVariables": {},
#     "requestContext": {
#         "resourceId": "123456",
#         "resourcePath": "/{proxy+}",
#         "httpMethod": "GET",
#         "extendedRequestId": "XYZ",
#         "requestTime": "12/Mar/2023:19:03:58 +0000",
#         "path": "/dev",
#         "accountId": "123456789012",
#         "protocol": "HTTP/1.1",
#         "stage": "dev",
#         "domainPrefix": "test",
#         "requestTimeEpoch": 1678658638000,
#         "requestId": "abcdefg",
#         "identity": {
#             "sourceIp": "1.2.3.4",
#             "userAgent": "Custom User Agent"
#         },
#         "domainName": "test.execute-api.us-east-1.amazonaws.com",
#         "apiId": "abcdef1234"
#     },
#     "body": None,
#     "isBase64Encoded": False
# }

# result = lambda_handler(event, {})
# print(result)
from main import lambda_handler

test_event = {
    "resource": "/",
    "path": "/",
    "httpMethod": "GET",
    "headers": {
        "Accept": "*/*",
        "Host": "example.com"
    },
    "multiValueHeaders": {},
    "queryStringParameters": None,
    "multiValueQueryStringParameters": None,
    "pathParameters": None,
    "requestContext": {
        "resourcePath": "/",
        "httpMethod": "GET",
        "path": "/dev/",
        "accountId": "123456789012",
        "stage": "dev"
    },
    "body": None,
    "isBase64Encoded": False
}

response = lambda_handler(test_event, {})
print(response)
