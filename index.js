require('dotenv').config()
const express = require('express')

const userRoutes = require('./routes/users.routes')
const authRoutes = require('./routes/auth.routes')

const { supabaseAnon } = require('./db/supabase')

const app = express()
const port = process.env.PORT || 3000

app.use(express.json())

// injecte le client "public" par défaut
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
