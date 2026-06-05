FROM node:20-bookworm

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

# Create virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copy BOTH python requirement files before installing
COPY python/requirements.txt ./python/requirements.txt
COPY python/requirements_ocr.txt ./python/requirements_ocr.txt

RUN pip install --no-cache-dir -r python/requirements.txt
RUN pip install --no-cache-dir -r python/requirements_ocr.txt

# Copy everything else
COPY . .

COPY start.sh .
RUN chmod +x start.sh

EXPOSE 5000

CMD ["./start.sh"]