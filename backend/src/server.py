# Add these lines to import and include the passport router
from src.api.routes import passport
app.include_router(passport.router, prefix="/api/passport", tags=["passport"]) 