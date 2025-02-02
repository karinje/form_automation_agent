from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import yaml
import subprocess
import tempfile
import os
from pathlib import Path

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/run-ds160")
async def run_ds160(file: UploadFile = File(...)):
    try:
        # First, ensure openai is installed
        try:
            import openai
        except ImportError:
            subprocess.check_call(["pip", "install", "openai"])
        
        # Create a temporary directory
        with tempfile.TemporaryDirectory() as temp_dir:
            # Save the uploaded YAML file
            temp_yaml_path = Path(temp_dir) / "temp_input.yaml"
            content = await file.read()
            with open(temp_yaml_path, "wb") as f:
                f.write(content)
            
            # Update the main script path in the environment
            env = os.environ.copy()
            env["DS160_INPUT_YAML"] = str(temp_yaml_path)
            
            # Run the main.py script
            result = subprocess.run(
                ["python", "main.py"],
                env=env,
                capture_output=True,
                text=True,
                cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Set working directory to project root
            )
            
            if result.returncode != 0:
                return {"status": "error", "message": result.stderr}
            
            return {"status": "success", "message": result.stdout}
            
    except Exception as e:
        return {"status": "error", "message": str(e)} 