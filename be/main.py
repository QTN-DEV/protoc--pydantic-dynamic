from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.controllers.root import router as root_router
from src.controllers.health import router as health_router
from src.controllers.pydantic_generator import router as pydantic_router
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(root_router)
app.include_router(health_router)
app.include_router(pydantic_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, workers=4)