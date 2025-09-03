from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# ✅ Allow frontend to talk to backend
origins = [
    "http://localhost:8080",   # React dev server
    "http://127.0.0.1:8080",   # Sometimes React uses this
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # Which domains can talk to backend
    allow_credentials=True,
    allow_methods=["*"],            # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],            # Allow all headers
)

# Import your routes
from app import routes
app.include_router(routes.router)
