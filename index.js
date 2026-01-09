require('dotenv').config()

const express = require('express')
const { createClient } = require('@supabase/supabase-js')

const app = express()
const port = 3000

app.use(express.json())

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
}

// Client Supabase admin (bypass RLS)
const supabaseAdmin = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
)

// 👉 on injecte supabase dans req (simple et pratique)
app.use((req, res, next) => {
    req.supabase = supabaseAdmin
    next()
})

app.get('/', (req, res) => {
    res.send('Hello World!')
})

// routes
const userRoutes = require('./routes/users.routes')
app.use('/users', userRoutes)

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
})
