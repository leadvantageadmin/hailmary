# Logstash Service Dockerfile
# Multi-stage build for optimized image size

# Stage 1: Base Logstash image
FROM docker.elastic.co/logstash/logstash:7.17.15

# Stage 2: Install additional plugins and Python dependencies
USER root

# Install Python and required packages
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-dev libpq-dev gcc && \
    rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip3 install --no-cache-dir \
    psycopg2-binary \
    elasticsearch \
    requests \
    python-dateutil

# Install Logstash plugins (Logstash 7.x has JDBC integration built-in)
RUN logstash-plugin install logstash-filter-ruby

# Create necessary directories
RUN mkdir -p /usr/share/logstash/data/logs \
    /usr/share/logstash/data/schema \
    /usr/share/logstash/data/checkpoints \
    /usr/share/logstash/config/pipelines \
    /usr/share/logstash/config/templates

# Copy configuration files
COPY config/logstash.yml /usr/share/logstash/config/
COPY config/pipelines.yml /usr/share/logstash/config/
COPY config/pipelines/ /usr/share/logstash/config/pipelines/
COPY config/templates/ /usr/share/logstash/config/templates/

# Copy Python libraries
COPY lib/ /usr/share/logstash/lib/

# Copy PostgreSQL JDBC driver
COPY postgresql-42.7.1.jar /usr/share/logstash/logstash-core/lib/jars/

# Set proper permissions
RUN chown -R logstash:logstash /usr/share/logstash/data \
    /usr/share/logstash/config \
    /usr/share/logstash/lib

# Switch back to logstash user
USER logstash

# Set environment variables
ENV LS_JAVA_OPTS="-Xmx1g -Xms1g"
ENV LOGSTASH_HOME="/usr/share/logstash"
ENV PATH="${LOGSTASH_HOME}/bin:${PATH}"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:9600/_node/stats || exit 1

# Expose ports
EXPOSE 5044 9600

# Default command - Don't use -f flag as it overrides pipelines.yml
CMD ["logstash", "--config.reload.automatic"]
