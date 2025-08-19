#!/usr/bin/env node

/**
 * Generate API documentation from OpenAPI specification
 *
 * This script:
 * 1. Creates a static API documentation structure
 * 2. Generates HTML pages to serve the documentation
 * 3. Creates an index page linking to all documentation
 */

const fs = require('fs');
const path = require('path');

async function generateApiDocs() {
  try {
    console.log('🔧 Generating API documentation...');

    // Create output directory
    const outputDir = path.join(__dirname, '..', 'dist', 'docs', 'api');
    fs.mkdirSync(outputDir, { recursive: true });

    // Create a placeholder OpenAPI spec (will be generated dynamically in production)
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Industrial Inventory Multi-App Framework API',
        version: '1.0.0',
        description:
          'RESTful API for the Industrial Inventory Multi-App Framework. View the live documentation at /api-docs when the server is running.',
      },
      servers: [
        { url: 'http://localhost:3010', description: 'Development server' },
        {
          url: 'http://localhost:3000/api',
          description: 'Development server via Nginx proxy',
        },
      ],
      paths: {
        '/health': {
          get: {
            summary: 'Get system health status',
            tags: ['Health'],
            responses: {
              200: {
                description: 'System is healthy',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'healthy' },
                        timestamp: { type: 'string', format: 'date-time' },
                        version: { type: 'string', example: '1.0.0' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const openApiPath = path.join(outputDir, 'openapi.json');
    fs.writeFileSync(openApiPath, JSON.stringify(openApiSpec, null, 2));
    console.log('✅ Generated OpenAPI specification:', openApiPath);

    // Create HTML page for API docs
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Industrial Inventory API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@latest/swagger-ui.css" />
    <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
        .notice { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px; border-radius: 4px; }
        .topbar { display: none !important; }
        .swagger-ui .info .title { color: #1976d2; }
        .swagger-ui .info .description p { color: #555; }
        .swagger-ui .scheme-container { background: #f5f5f5; padding: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Industrial Inventory API Documentation</h1>
        <p>Static documentation build - For live interactive docs, visit /api-docs on the running server</p>
    </div>
    <div class="notice">
        <strong>Note:</strong> This is a static build of the API documentation. 
        For the most up-to-date and interactive documentation with live API testing, 
        please visit <code>/api-docs</code> on the running development server.
    </div>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@latest/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@latest/swagger-ui-standalone-preset.js"></script>
    <script>
        SwaggerUIBundle({
            url: './openapi.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
            ],
            plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout",
            docExpansion: 'none',
            filter: true,
            showRequestHeaders: true,
            showCommonExtensions: true,
            tryItOutEnabled: false
        });
    </script>
</body>
</html>`;

    const htmlPath = path.join(outputDir, 'index.html');
    fs.writeFileSync(htmlPath, htmlContent);
    console.log('✅ Generated API documentation HTML:', htmlPath);

    // Create a README for the API docs
    const readmeContent = `# API Documentation

This directory contains the generated API documentation for the Industrial Inventory Multi-App Framework.

## Files

- \`index.html\` - Static API documentation (Swagger UI)
- \`openapi.json\` - OpenAPI 3.0 specification in JSON format

## Usage

### Live Documentation (Recommended)

For the most up-to-date and interactive documentation, start the development server and visit:

- \`http://localhost:3010/api-docs\` (Direct API server)
- \`http://localhost:3000/api-docs\` (Via Nginx proxy)

### Static Documentation

Open \`index.html\` in a web browser to view this static version.

### Integration

The OpenAPI specification can be imported into API testing tools like Postman or Insomnia.

## Generation

This documentation is automatically generated as part of the documentation build process.
To regenerate, run:

\`\`\`bash
pnpm docs:build:api
\`\`\`

## Last Generated

${new Date().toISOString()}
`;

    const readmePath = path.join(outputDir, 'README.md');
    fs.writeFileSync(readmePath, readmeContent);
    console.log('✅ Generated API documentation README:', readmePath);

    console.log('🎉 API documentation generation complete!');
  } catch (error) {
    console.error('❌ Error generating API documentation:', error.message);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  generateApiDocs();
}

module.exports = { generateApiDocs };
