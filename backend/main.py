from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from .run_compiler import run_c_compiler

app = FastAPI()

# Allow frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your Vercel domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CodeInput(BaseModel):
    code: str

@app.get("/")
async def root():
    return {"message": "C Compiler API is running!"}

@app.post("/compile/")
async def compile_code(code_input: CodeInput):
    try:
        output = run_c_compiler(code_input.code)
        return {"output": output, "error": False}
    except Exception as e:
        return {"output": str(e), "error": True}

# For deployment
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)