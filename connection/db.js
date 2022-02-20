// import postgress pool
const { Pool } = require('pg')

// setup connection pool
const dbPool = new Pool({
    database: 'DATA_TUGAS',
    port: 5432,
    user: 'postgres',
    password: '123456789' // based on your password config on postgre
})

// export db pool to be used for query
module.exports = dbPool
