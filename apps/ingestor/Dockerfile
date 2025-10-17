FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py /app/app.py
COPY comprehensive_standardizer.py /app/comprehensive_standardizer.py
COPY fuzzy_standardizer.py /app/fuzzy_standardizer.py
COPY standardization_loader.py /app/standardization_loader.py
COPY analyze_unknowns.py /app/analyze_unknowns.py
COPY debug_riyadh.py /app/debug_riyadh.py
COPY test_enhanced_logic.py /app/test_enhanced_logic.py
COPY test_zipcode_data.py /app/test_zipcode_data.py
COPY standardization/ /app/standardization/
CMD ["python", "app.py", "/data/customers.csv"]