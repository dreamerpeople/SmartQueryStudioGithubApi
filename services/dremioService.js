/**
 * @file services/dremioService.js
 * @description Service for interacting with Dremio Cloud REST API.
 * Handles SQL execution, job polling, and result retrieval.
 */

const axios = require('axios');
require('dotenv').config();

const DREMIO_API_URL = process.env.DREMIO_API_URL || 'https://api.dremio.cloud';
const DREMIO_TOKEN = process.env.DREMIO_TOKEN;
const DREMIO_PROJECT_ID = process.env.DREMIO_PROJECT_ID;

/**
 * Executes a SQL query on Dremio Cloud.
 * 
 * @param {string} sql - The SQL statement to run.
 * @returns {Promise<{rows: any[], query: string}>} The query results and the original query.
 */
async function executeSql(sql) {
  if (!DREMIO_TOKEN || !DREMIO_PROJECT_ID) {
    throw new Error('DREMIO_TOKEN or DREMIO_PROJECT_ID is not configured in .env');
  }

  try {
    const baseUrl = `${DREMIO_API_URL}/v0/projects/${DREMIO_PROJECT_ID}`;
    console.log(sql);
    
    // Step 1: Submit SQL Job
    const sqlResponse = await axios.post(`${baseUrl}/sql`, { sql }, {
      headers: {
        'Authorization': `Bearer ${DREMIO_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const jobId = sqlResponse.data.id;
    console.log(`[Dremio] Job submitted. ID: ${jobId}`);

    // Step 2: Poll for completion
    let status = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max

    while (['RUNNING', 'STARTING', 'PENDING', 'METADATA_RETRIEVAL', 'PLANNING'].includes(status) && attempts < maxAttempts) {
      const jobRes = await axios.get(`${baseUrl}/job/${jobId}`, {
        headers: { 'Authorization': `Bearer ${DREMIO_TOKEN}` }
      });
      status = jobRes.data.jobState;
      
      if (status === 'COMPLETED') break;
      if (['FAILED', 'CANCELED'].includes(status)) {
        throw new Error(`Dremio job ${status}: ${jobRes.data.errorMessage || 'Unknown error'}`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (status !== 'COMPLETED') {
      throw new Error(`Dremio job timed out or failed with status: ${status}`);
    }

    // Step 3: Fetch Results
    const resultsResponse = await axios.get(`${baseUrl}/job/${jobId}/results`, {
      headers: { 'Authorization': `Bearer ${DREMIO_TOKEN}` }
    });

    return {
      rows: resultsResponse.data.rows || [],
      query: sql
    };

  } catch (error) {
    console.error('[Dremio Service Error]', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  executeSql
};
