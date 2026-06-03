FROM node:20-bullseye

# Install Python and dependencies required for canvas/tesseract if any
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    tesseract-ocr \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Set up working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy Python requirements and install
COPY python/requirements.txt ./python/
RUN pip3 install --no-cache-dir -r python/requirements.txt
RUN pip3 install --no-cache-dir -r python/requirements_ocr.txt || true

# Copy all other backend files
COPY . .

# Expose the API port
EXPOSE 5000

# Start the application (you may need to run python:bg and start separately as per your package.json, 
# or use dev:full. For production, usually a process manager like pm2 or concurrently is used).
COPY start.sh .
RUN chmod +x start.sh
CMD ["./start.sh"]
