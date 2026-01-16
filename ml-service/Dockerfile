FROM python:3.10-slim

WORKDIR /app

# Install build dependencies just in case
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for cache
COPY requirements.txt .

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Download the required spacy model
RUN python -m spacy download en_core_web_sm

# Download sentence-transformers model during build to improve startup time
# Create a small script to download the model
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy the rest of the application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=7860

# Expose the port that Hugging Face Spaces expects (7860)
EXPOSE 7860

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
