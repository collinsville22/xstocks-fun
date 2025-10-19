/**
 * Vercel Serverless Function - Intel API Proxy
 * Proxies requests to EC2 Intel microservice with HTTPS
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// EC2 Intel Service URL
const INTEL_API_URL = 'http://18.208.139.71:8002';

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
    // Extract the path from the query parameter
    const { path } = req.query;
    const apiPath = Array.isArray(path) ? path.join('/') : path || '';

    // Construct the full URL to EC2 backend
    const backendUrl = `${INTEL_API_URL}/${apiPath}`;

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
