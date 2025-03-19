from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .routes import ds160
from .routes import linkedin
from .routes import pdf  # Import the new route
from .routes import i94
from .routes import documents
from .routes import passport
import logging
from logging.handlers import RotatingFileHandler
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Create logs directory if it doesn't exist
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'logs')
os.makedirs(log_dir, exist_ok=True)

# Configure logging
log_file = os.path.join(log_dir, 'ds160.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(funcName)s - %(message)s',
    handlers=[
        RotatingFileHandler(log_file, maxBytes=10000000, backupCount=5),
        logging.StreamHandler()  # This will still show logs in console too
    ]
)
logger = logging.getLogger(__name__)

# Log environment variables availability
logger.info(f"LinkedIn credentials available: Username: {'Yes' if os.environ.get('LINKEDIN_USERNAME') else 'No'}, Password: {'Yes' if os.environ.get('LINKEDIN_PASSWORD') else 'No'}")

app = FastAPI(title="DS-160 Automation API")

# Add CORS middleware
origins = [
    "http://localhost:3000",  # Local frontend
    "https://form-automation-agent.vercel.app/",  # Example production domain
    "*",  # For development, allow all origins (remove in production)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global error handler caught: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error", "details": str(exc)}
    )

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("Starting up DS-160 Automation API")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down DS-160 Automation API")

# Include routers
app.include_router(ds160.router, prefix="/api/ds160", tags=["ds160"])
app.include_router(linkedin.router, prefix="/api/linkedin", tags=["linkedin"])
app.include_router(pdf.router, prefix="/api")
app.include_router(i94.router, prefix="/api/i94", tags=["i94"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(passport.router, prefix="/api/passport", tags=["passport"])
@app.get("/")
async def root():
    return {"message": "DS-160 Backend API"}
