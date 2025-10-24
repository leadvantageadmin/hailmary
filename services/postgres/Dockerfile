# PostgreSQL Service Dockerfile
# Based on PostGIS image for geospatial support
FROM postgis/postgis:15-3.4

# Set environment variables
ENV POSTGRES_USER=app
ENV POSTGRES_PASSWORD=app
ENV POSTGRES_DB=app
ENV POSTGRES_INITDB_ARGS="--encoding=UTF-8 --lc-collate=C --lc-ctype=C"

# Install additional tools for schema management
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI for schema pulling
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js and Prisma CLI for schema management
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g prisma@latest \
    && rm -rf /var/lib/apt/lists/*

# Copy custom configurations
COPY config/ /etc/postgresql/
COPY init/ /docker-entrypoint-initdb.d/

# Set wal_level to logical for CDC support
RUN sed -i 's/wal_level = replica/wal_level = logical/' /etc/postgresql/postgresql.conf

# Copy schema management scripts
COPY scripts/ /usr/local/bin/
RUN chmod +x /usr/local/bin/*.sh

# Create directory for schema files
RUN mkdir -p /app/schema

# Expose PostgreSQL port
EXPOSE 5432

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
    CMD pg_isready -U app -d app || exit 1

# Set default command
CMD ["postgres"]
