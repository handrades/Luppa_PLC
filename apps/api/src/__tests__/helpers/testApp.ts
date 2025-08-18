/**
 * Test App Helper
 *
 * Creates a test Express application for integration testing
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import { Express, NextFunction, Request, Response } from 'express';

const express = require('express');

// Type definitions for test data
interface TestSite {
  id: string;
  name: string;
  cellCount: number;
  equipmentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface TestCell {
  id: string;
  siteId: string;
  name: string;
  lineNumber: string;
  equipmentCount: number;
  siteName: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory storage for test data
const testData = {
  sites: new Map<string, TestSite>(),
  cells: new Map<string, TestCell>(),
};

/**
 * Creates a minimal test Express app with basic middleware
 * This is a mock implementation for testing purposes
 */
export async function createTestApp(): Promise<Express> {
  const app = express();

  // Basic middleware setup
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mock authentication middleware
  app.use('/api/v1', (req: Request, res: Response, next: NextFunction) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  });

  // Sites routes
  app.post('/api/v1/sites', (req: Request, res: Response) => {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Validation failed',
        details: { name: ['Site name is required'] },
      });
    }

    // Check for duplicates
    const existingSites = Array.from(testData.sites.values());
    for (const site of existingSites) {
      if (site.name === name) {
        return res.status(409).json({ error: `Site name '${name}' already exists` });
      }
    }

    const siteId = `550e8400-e29b-41d4-a716-${String(Math.random()).slice(2, 14).padStart(12, '0')}`;
    const site = {
      id: siteId,
      name,
      cellCount: 0,
      equipmentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    testData.sites.set(siteId, site);

    return res.status(201).json({
      message: 'Site created successfully',
      site,
    });
  });

  // Cells routes
  app.post('/api/v1/cells', (req: Request, res: Response) => {
    const { siteId, name, lineNumber } = req.body;

    if (!siteId || !name || !lineNumber) {
      return res.status(400).json({
        error: 'Validation failed',
        details: {
          siteId: !siteId ? ['Site ID is required'] : undefined,
          name: !name ? ['Cell name is required'] : undefined,
          lineNumber: !lineNumber ? ['Line number is required'] : undefined,
        },
      });
    }

    // Check if site exists
    const site = testData.sites.get(siteId);
    if (!site) {
      return res.status(404).json({ error: `Site with ID '${siteId}' not found` });
    }

    const cellId = `550e8400-e29b-41d4-a716-${String(Math.random()).slice(2, 14).padStart(12, '0')}`;
    const cell = {
      id: cellId,
      siteId,
      name,
      lineNumber: lineNumber.toUpperCase(),
      equipmentCount: 0,
      siteName: site.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    testData.cells.set(cellId, cell);

    return res.status(201).json({
      message: 'Cell created successfully',
      cell,
    });
  });

  // Handle other endpoints with basic responses
  app.use('/api/v1', (req: Request, res: Response) => {
    // For any other endpoint, return a basic success response
    const method = req.method;

    if (method === 'GET') {
      return res.status(200).json({
        message: 'Mock response',
        data: [],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
        },
      });
    }

    // Default response for unsupported operations
    res.status(200).json({ message: 'Mock response', data: [] });
  });

  return app;
}
