FROM python:3.10-slim

WORKDIR /app

# Install system dependencies - split into multiple commands to reduce memory usage
RUN apt-get update
RUN apt-get install -y build-essential wget curl git
RUN apt-get install -y libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0
RUN apt-get install -y libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 
RUN apt-get install -y libasound2 libpango-1.0-0 libcairo2 libfontconfig1
RUN rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir PyYAML

# Install Playwright browsers
RUN python -m playwright install --with-deps chromium

# Copy the application
COPY src/ /app/src/
COPY ../shared/ /app/shared/

# Create logs directory
RUN mkdir -p /app/logs

# Set environment variables
ENV PYTHONPATH=/app
ENV DS160_BASE_URL=https://ceac.state.gov/GenNIV/Default.aspx
ENV OPENAI_API_KEY=${OPENAI_API_KEY}

# Run the application
CMD ["uvicorn", "src.api.server:app", "--host", "0.0.0.0", "--port", "8000"] 