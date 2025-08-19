#!/usr/bin/env node

/**
 * Copy documentation files to the unified documentation output directory
 *
 * This script:
 * 1. Copies markdown documentation files to the output directory
 * 2. Creates an index page for all documentation
 * 3. Organizes documentation by type (guides, architecture, etc.)
 */

const fs = require('fs');
const path = require('path');

async function copyDocs() {
  try {
    console.log('🔧 Copying documentation files...');

    const baseDir = path.join(__dirname, '..');
    const outputDir = path.join(baseDir, 'dist', 'docs');

    // Ensure output directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    // Copy main documentation files
    const mainDocs = [
      { src: 'README.md', dest: 'readme.md', title: 'Project Overview' },
      { src: 'SETUP.md', dest: 'setup.md', title: 'Setup Guide' },
      {
        src: 'CONTRIBUTING.md',
        dest: 'contributing.md',
        title: 'Contributing Guidelines',
      },
      {
        src: 'ARCHITECTURE.md',
        dest: 'architecture.md',
        title: 'Architecture Overview',
      },
      {
        src: 'TROUBLESHOOTING.md',
        dest: 'troubleshooting.md',
        title: 'Troubleshooting Guide',
      },
    ];

    const guidesDir = path.join(outputDir, 'guides');
    fs.mkdirSync(guidesDir, { recursive: true });

    for (const doc of mainDocs) {
      const srcPath = path.join(baseDir, doc.src);
      const destPath = path.join(guidesDir, doc.dest);

      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✅ Copied ${doc.src} to guides/${doc.dest}`);
      }
    }

    // Copy architecture documentation
    const archDir = path.join(outputDir, 'architecture');
    const srcArchDir = path.join(baseDir, 'docs', 'architecture');

    if (fs.existsSync(srcArchDir)) {
      copyDirectoryRecursive(srcArchDir, archDir);
      console.log('✅ Copied architecture documentation');
    }

    // Create main documentation index
    const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Industrial Inventory Framework Documentation</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            max-width: 1200px; margin: 0 auto; padding: 20px; 
            background: #f8f9fa;
        }
        .header { 
            background: linear-gradient(135deg, #1976d2, #42a5f5); 
            color: white; padding: 40px; text-align: center; 
            border-radius: 8px; margin-bottom: 30px;
        }
        .header h1 { margin: 0; font-size: 2.5rem; }
        .header p { margin: 10px 0 0; opacity: 0.9; }
        .section { 
            background: white; margin: 20px 0; padding: 30px; 
            border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .section h2 { 
            color: #1976d2; margin-top: 0; 
            border-bottom: 2px solid #e3f2fd; padding-bottom: 10px;
        }
        .doc-grid { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; margin-top: 20px;
        }
        .doc-card { 
            border: 1px solid #e0e0e0; padding: 20px; border-radius: 6px; 
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .doc-card:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .doc-card h3 { margin-top: 0; color: #1976d2; }
        .doc-card a { 
            color: #1976d2; text-decoration: none; font-weight: 500;
        }
        .doc-card a:hover { text-decoration: underline; }
        .footer { 
            text-align: center; padding: 20px; color: #666; 
            border-top: 1px solid #e0e0e0; margin-top: 40px;
        }
        .quick-links { 
            display: flex; justify-content: center; gap: 20px; 
            margin: 20px 0; flex-wrap: wrap;
        }
        .quick-links a { 
            background: #1976d2; color: white; padding: 12px 24px; 
            border-radius: 6px; text-decoration: none; transition: background 0.2s;
        }
        .quick-links a:hover { background: #1565c0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Industrial Inventory Framework</h1>
        <p>Comprehensive Documentation Portal</p>
    </div>

    <div class="quick-links">
        <a href="./storybook/index.html">📚 Component Library</a>
        <a href="./api/index.html">🔧 API Documentation</a>
        <a href="./guides/setup.md">⚡ Quick Start</a>
    </div>

    <div class="section">
        <h2>📖 Getting Started</h2>
        <div class="doc-grid">
            <div class="doc-card">
                <h3>Setup Guide</h3>
                <p>Complete setup instructions for development environment, prerequisites, and first-time configuration.</p>
                <a href="./guides/setup.md">Read Setup Guide →</a>
            </div>
            <div class="doc-card">
                <h3>Contributing Guidelines</h3>
                <p>Learn how to contribute to the project, coding standards, and development workflow.</p>
                <a href="./guides/contributing.md">View Guidelines →</a>
            </div>
            <div class="doc-card">
                <h3>Troubleshooting</h3>
                <p>Common issues and their solutions to help you resolve development problems quickly.</p>
                <a href="./guides/troubleshooting.md">Get Help →</a>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>🏗️ Architecture & Design</h2>
        <div class="doc-grid">
            <div class="doc-card">
                <h3>Architecture Overview</h3>
                <p>High-level system architecture, design patterns, and key architectural decisions.</p>
                <a href="./guides/architecture.md">View Architecture →</a>
            </div>
            <div class="doc-card">
                <h3>ADRs (Architectural Decision Records)</h3>
                <p>Detailed records of architectural decisions with context and rationale.</p>
                <a href="./architecture/adrs/">Browse ADRs →</a>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>🛠️ Development Resources</h2>
        <div class="doc-grid">
            <div class="doc-card">
                <h3>API Documentation</h3>
                <p>Interactive API documentation with request/response examples and testing capabilities.</p>
                <a href="./api/index.html">Explore API →</a>
            </div>
            <div class="doc-card">
                <h3>Component Library</h3>
                <p>Interactive component documentation with live examples and usage guidelines.</p>
                <a href="./storybook/index.html">View Components →</a>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>Generated on ${new Date().toLocaleDateString()} • Industrial Inventory Multi-App Framework</p>
    </div>
</body>
</html>`;

    const indexPath = path.join(outputDir, 'index.html');
    fs.writeFileSync(indexPath, indexContent);
    console.log('✅ Generated documentation index page');

    console.log('🎉 Documentation copying complete!');
  } catch (error) {
    console.error('❌ Error copying documentation:', error.message);
    process.exit(1);
  }
}

/**
 * Recursively copy a directory
 */
function copyDirectoryRecursive(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);

    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectoryRecursive(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

// Run the script if called directly
if (require.main === module) {
  copyDocs();
}

module.exports = { copyDocs };
