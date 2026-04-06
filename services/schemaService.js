const { executeSql } = require("./dremioService");

let cachedSchema = null;
let lastFetchTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Fetches the database schema dynamically from Dremio and formats it into a prompt-friendly string.
 * Uses a 1-hour in-memory cache to prevent excessive DB calls.
 * @returns {Promise<string>} The formatted schema string or fallback text.
 */
async function getDynamicSchemaContext() {
  const now = Date.now();
  if (cachedSchema && (now - lastFetchTime) < CACHE_TTL) {
    return cachedSchema;
  }

  const sql = `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE 
               FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'EcommerceDB.dpcommerce'`;

  try {
    const res = await executeSql(sql);
    const schemaMap = res.rows.reduce((acc, row) => {
      const tableName = row.TABLE_NAME;
      if (!acc[tableName]) {
        acc[tableName] = [];
      }
      acc[tableName].push(row.COLUMN_NAME); // Can append \` (\${row.DATA_TYPE})\` if data types are useful
      return acc;
    }, {});

    const formattedLines = Object.entries(schemaMap).map(([tableName, columns]) => {
      return `• ${tableName} (${columns.join(', ')})`;
    });

    cachedSchema = formattedLines.join('\n');
    lastFetchTime = now;
    console.log("[SchemaService] Successfully refreshed dynamic schema cache.");

    return cachedSchema;
  } catch (err) {
    console.error("[SchemaService] Failed to load dynamic schema:", err.message);
    if (cachedSchema) {
      console.log("[SchemaService] Warning: Using stale schema due to fetch error.");
      return cachedSchema; 
    }
    return "• Error fetching tables. Please use general naming conventions.";
  }
}

module.exports = {
  getDynamicSchemaContext,
};
