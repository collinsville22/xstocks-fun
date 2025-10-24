/**
 * Vercel Serverless Function - Intel API Proxy
 * Proxies requests to EC2 Intel microservice with HTTPS
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// EC2 Intel Service URL (use environment variable for security)
const INTEL_API_URL = process.env.INTEL_API_URL || 'http://localhost:8000';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Extract the path and other query parameters
    const { path, ...otherParams } = req.query;
    const apiPath = Array.isArray(path) ? path.join('/') : path || '';

    // Build query string from remaining parameters
    const queryString = new URLSearchParams(
      Object.entries(otherParams).reduce((acc, [key, value]) => {
        acc[key] = Array.isArray(value) ? value.join(',') : value as string;
        return acc;
      }, {} as Record<string, string>)
    ).toString();

    // Construct the full URL to EC2 backend
    const backendUrl = `${INTEL_API_URL}/${apiPath}${queryString ? `?${queryString}` : ''}`;

    console.log(`[Proxy] Forwarding ${req.method} request to: ${backendUrl}`);

    // Forward the request to EC2 backend
    const response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    // Get the response data
    const data = await response.json();

    // Return the response
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[Proxy] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch from Intel API',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
