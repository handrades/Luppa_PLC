#!/bin/bash
# Generate self-signed SSL certificates for development and testing
# For production, replace with certificates from a trusted CA

set -euo pipefail

# Default values (can be overridden by environment variables)
SSL_COUNTRY="${SSL_COUNTRY:-US}"
SSL_STATE="${SSL_STATE:-State}"
SSL_LOCALITY="${SSL_LOCALITY:-City}"
SSL_ORGANIZATION="${SSL_ORGANIZATION:-Luppa Organization}"
SSL_ORG_UNIT="${SSL_ORG_UNIT:-IT Department}"
SSL_COMMON_NAME="${SSL_COMMON_NAME:-localhost}"
SSL_DAYS="${SSL_DAYS:-365}"

# Certificate paths
CERT_DIR="$(dirname "$0")"
CERT_FILE="${CERT_DIR}/server.crt"
KEY_FILE="${CERT_DIR}/server.key"
CSR_FILE="${CERT_DIR}/server.csr"

echo "Generating self-signed SSL certificate for ${SSL_COMMON_NAME}"
echo "Certificate will be valid for ${SSL_DAYS} days"

# Generate private key using modern openssl genpkey
echo "Generating private key..."
openssl genpkey -algorithm RSA -out "${KEY_FILE}" -pkcs8 -pkeyopt rsa_keygen_bits:4096

# Generate certificate signing request
echo "Generating certificate signing request..."
openssl req -new -key "${KEY_FILE}" -out "${CSR_FILE}" \
  -subj "/C=${SSL_COUNTRY}/ST=${SSL_STATE}/L=${SSL_LOCALITY}/O=${SSL_ORGANIZATION}/OU=${SSL_ORG_UNIT}/CN=${SSL_COMMON_NAME}"

# Generate self-signed certificate with SAN extension
echo "Generating self-signed certificate..."
openssl x509 -req -days "${SSL_DAYS}" -in "${CSR_FILE}" -signkey "${KEY_FILE}" -out "${CERT_FILE}" \
  -extensions v3_req -extfile <(
    echo "[req]"
    echo "distinguished_name = req_distinguished_name"
    echo "[v3_req]"
    echo "keyUsage = keyEncipherment, dataEncipherment"
    echo "extendedKeyUsage = serverAuth"
    echo "subjectAltName = @alt_names"
    echo "[alt_names]"
    echo "DNS.1 = ${SSL_COMMON_NAME}"
    echo "DNS.2 = localhost"
    echo "DNS.3 = *.localhost"
    echo "IP.1 = 127.0.0.1"
    echo "IP.2 = ::1"
  )

# Clean up CSR file
rm -f "${CSR_FILE}"

# Set appropriate permissions
chmod 600 "${KEY_FILE}"
chmod 644 "${CERT_FILE}"

echo "SSL certificate generated successfully!"
echo "Certificate: ${CERT_FILE}"
echo "Private Key: ${KEY_FILE}"
echo ""
echo "To view certificate details:"
echo "openssl x509 -in ${CERT_FILE} -text -noout"
echo ""
echo "To create Docker secrets (for production deployment):"
echo "docker secret create ssl-cert ${CERT_FILE}"
echo "docker secret create ssl-key ${KEY_FILE}"
