# 1. Immagine base con Python
FROM python:3.12-slim

# 2. Impostazioni Python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Cartella di lavoro
WORKDIR /app

# 4. Pacchetti di sistema (se ti servono altri, aggiungili qui)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 5. Dipendenze Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copia il codice del progetto
COPY . .

# 7. Espone la porta usata da Django
EXPOSE 8000

# 8. Comando di avvio (sviluppo)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
