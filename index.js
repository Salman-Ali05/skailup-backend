require('dotenv').config()
const express = require('express')
const cors = require('cors')

const userRoutes = require('./routes/users.routes')
const authRoutes = require('./routes/auth.routes')

const { supabaseAnon } = require('./db/supabase')

const app = express()
const port = process.env.PORT || 3000

const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.LOCALHOST_URL,
    process.env.LOCALHOST_URL_2
].filter(Boolean)

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true)

        if (allowedOrigins.includes(origin)) {
            return callback(null, true)
        }

        return callback(null, false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

app.use(express.json())

app.use((req, res, next) => {
    req.supabase = supabaseAnon
    next()
})

app.get('/', (req, res) => {
    res.send('SkailUp Backend is running!')
})

app.use('/users', userRoutes)
app.use('/auth', authRoutes)

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
})
