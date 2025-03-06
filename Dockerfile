# Use official Python image
FROM python:3.10-slim AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Final lightweight image
FROM python:3.10-slim

WORKDIR /app

# Copy only required files from the builder stage
COPY --from=builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY . .

# Expose Flask port
EXPOSE 5000

# Start the Flask app
CMD ["python", "app.py"]
