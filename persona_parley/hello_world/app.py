from fastapi import FastAPI
from mangum import Mangum

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello from AWS Lambda!"}

lambda_handler = Mangum(app)
