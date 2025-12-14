// Neon Database Statistics Function - Fetches database performance metrics
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    
    if (!databaseUrl) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Database URL not configured',
          stats: null
        })
      };
    }

    const sql = neon(databaseUrl);

    // Fetch database statistics
    const stats = {
      connectionInfo: {
        isPooled: databaseUrl.includes('-pooler'),
        connectionString: databaseUrl.substring(0, 30) + '...' + databaseUrl.substring(databaseUrl.length - 10)
      },
      databaseSize: null,
      tableStats: [],
      connectionStats: null,
      queryStats: null,
      indexStats: []
    };

    try {
      // Get database size
      const dbSizeResult = await sql`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as size,
          pg_database_size(current_database()) as size_bytes
      `;
      if (dbSizeResult && dbSizeResult.length > 0) {
        stats.databaseSize = {
          formatted: dbSizeResult[0].size,
          bytes: dbSizeResult[0].size_bytes
        };
      }
    } catch (err) {
      console.warn('Could not fetch database size:', err.message);
    }

    try {
      // Get table statistics
      const tableStatsResult = await sql`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
          (SELECT COUNT(*) FROM pg_stat_user_tables WHERE relname = tablename) as row_count
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 20
      `;
      stats.tableStats = tableStatsResult || [];
    } catch (err) {
      console.warn('Could not fetch table stats:', err.message);
    }

    try {
      // Get connection statistics
      const connectionStatsResult = await sql`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
        FROM pg_stat_activity
        WHERE datname = current_database()
      `;
      if (connectionStatsResult && connectionStatsResult.length > 0) {
        stats.connectionStats = connectionStatsResult[0];
      }
    } catch (err) {
      console.warn('Could not fetch connection stats:', err.message);
    }

    try {
      // Get query statistics
      const queryStatsResult = await sql`
        SELECT 
          datname,
          numbackends as active_backends,
          xact_commit as transactions_committed,
          xact_rollback as transactions_rolled_back,
          blks_read as disk_blocks_read,
          blks_hit as cache_blocks_hit,
          tup_returned as tuples_returned,
          tup_fetched as tuples_fetched,
          tup_inserted as tuples_inserted,
          tup_updated as tuples_updated,
          tup_deleted as tuples_deleted
        FROM pg_stat_database
        WHERE datname = current_database()
      `;
      if (queryStatsResult && queryStatsResult.length > 0) {
        stats.queryStats = queryStatsResult[0];
      }
    } catch (err) {
      console.warn('Could not fetch query stats:', err.message);
    }

    try {
      // Get index statistics
      const indexStatsResult = await sql`
        SELECT 
          schemaname,
          tablename,
          indexname,
          pg_size_pretty(pg_relation_size(indexrelid)) as size,
          idx_scan as scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC
        LIMIT 20
      `;
      stats.indexStats = indexStatsResult || [];
    } catch (err) {
      console.warn('Could not fetch index stats:', err.message);
    }

    // Check if neon extension is available
    let neonExtensionAvailable = false;
    let neonCacheStats = null;
    try {
      const extensionCheck = await sql`
        SELECT EXISTS(
          SELECT 1 FROM pg_extension WHERE extname = 'neon'
        ) as exists
      `;
      neonExtensionAvailable = extensionCheck && extensionCheck.length > 0 && extensionCheck[0].exists;

      if (neonExtensionAvailable) {
        try {
          const cacheStatsResult = await sql`
            SELECT * FROM neon_stat_file_cache LIMIT 1
          `;
          if (cacheStatsResult && cacheStatsResult.length > 0) {
            neonCacheStats = cacheStatsResult[0];
          }
        } catch (err) {
          console.warn('Could not fetch Neon cache stats:', err.message);
        }
      }
    } catch (err) {
      console.warn('Could not check Neon extension:', err.message);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        stats: {
          ...stats,
          neonExtension: {
            available: neonExtensionAvailable,
            cacheStats: neonCacheStats
          }
        }
      })
    };
  } catch (error) {
    console.error("NEON STATS ERROR:", {
      message: error.message,
      stack: error.stack
    });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({ 
        success: false,
        error: error.message || "Failed to fetch Neon database statistics",
        details: error.stack
      })
    };
  }
};
