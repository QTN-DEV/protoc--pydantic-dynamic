from fastapi import FastAPI
from src.controllers.root import router as root_router
from src.controllers.health import router as health_router

app = FastAPI()

app.include_router(root_router)
app.include_router(health_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, workers=4)