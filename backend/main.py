from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.post("/ask_debate")
async def ask_debate(request: Request):
    data = await request.json()
    user_input = data.get("question", "")
    # TODO: Process user_input or pass it to LLM
    return {"response": f"You asked: {user_input}"}
