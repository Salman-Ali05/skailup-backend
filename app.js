require('dotenv').config()
const express = require('express')
const cors = require('cors')

const userRoutes = require('./routes/users.routes')
const authRoutes = require('./routes/auth.routes')

const { supabaseAnon } = require('./db/supabase')

const app = express()

const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.LOCALHOST_URL,
    process.env.LOCALHOST_URL_2
].filter(Boolean)

const corsOptions = {
    origin: (origin, cb) => {
        if (!origin) return cb(null, true) // Postman/curl
        return cb(null, allowedOrigins.includes(origin))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
}

app.use(cors(corsOptions))
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') return cors(corsOptions)(req, res, next)
    next()
})
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

module.exports = app
