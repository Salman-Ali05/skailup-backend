require('dotenv').config()
const express = require('express')
const cors = require('cors')

const userRoutes = require('./routes/users.routes')
const authRoutes = require('./routes/auth.routes')
const programRoutes = require('./routes/programs.routes')
const contributorsRoutes = require('./routes/contributors.routes')
const os_tagsRoutes = require('./routes/os_tags.routes')
const structureRoutes = require('./routes/structures.routes')
const projectRoutes = require('./routes/projects.routes')
const program_projectsRoutes = require('./routes/program_projects.routes')
const program_contributorsRoutes = require('./routes/program_contributors.routes')
const tag_param_structureRoutes = require('./routes/tag_param_structure.routes')

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
app.use('/programs', programRoutes)
app.use('/contributors', contributorsRoutes)
app.use('/os_tags', os_tagsRoutes) // on mettra tout nos OS ici
app.use('/structures', structureRoutes)
app.use('/projects', projectRoutes)
app.use('/program_projects', program_projectsRoutes)
app.use('/program_contributors', program_contributorsRoutes)
app.use('/tag_param_structure', tag_param_structureRoutes)

module.exports = app
