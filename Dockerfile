FROM ubuntu:24.04

# Install basic dependencies
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    gnupg \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (Latest LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g npm@latest

# Install Bitcoin Core Binaries (v26.0)
RUN wget https://bitcoincore.org/bin/bitcoin-core-26.0/test.txt && \
    wget https://bitcoincore.org/bin/bitcoin-core-26.0/bitcoin-26.0-x86_64-linux-gnu.tar.gz && \
    tar -xzf bitcoin-26.0-x86_64-linux-gnu.tar.gz && \
    install -m 0755 -o root -g root -t /usr/local/bin bitcoin-26.0/bin/* && \
    rm -rf bitcoin-26.0*

# Create bitcoin user and app directories
RUN useradd -m -s /bin/bash bitcoin && \
    mkdir -p /home/bitcoin/btc-node && \
    mkdir -p /home/bitcoin/.bitcoin && \
    chown -R bitcoin:bitcoin /home/bitcoin

# Set working directory
WORKDIR /home/bitcoin

# Copy project files
COPY package.json package-lock.json ./
RUN npm install --production || true

COPY index.js miner.js ./
COPY run.sh run_docker.sh ./
COPY src/ ./src/
COPY bitcoin.conf ./bitcoin.conf

# Fix permissions
RUN chown -R bitcoin:bitcoin /home/bitcoin && \
    chmod +x /home/bitcoin/run.sh /home/bitcoin/run_docker.sh

# Switch to bitcoin user
USER bitcoin

# Expose RPC and P2P ports
EXPOSE 18443 18444

# Default command
CMD ["./run_docker.sh"]