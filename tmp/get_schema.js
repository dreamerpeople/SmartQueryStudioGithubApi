const { executeSql } = require("../services/dremioService");
const fs = require("fs");

async function getSchema() {
  const sql = `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE 
               FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'EcommerceDB.dpcommerce'`;
  try {
    const res = await executeSql(sql);
    const schema = res.rows.reduce((acc, row) => {
      const tableName = row.TABLE_NAME;
      if (!acc[tableName]) acc[tableName] = [];
      acc[tableName].push(`${row.COLUMN_NAME} (${row.DATA_TYPE})`);
      return acc;
    }, {});
    fs.writeFileSync("./tmp/full_schema.json", JSON.stringify(schema, null, 2));
    console.log("✅ Schema saved to tmp/full_schema.json");
  } catch (err) {
    console.error("❌ Error fetching schema:", err.message);
  }
}
getSchema();
