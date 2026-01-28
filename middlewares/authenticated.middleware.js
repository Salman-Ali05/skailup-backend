const authenticated = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]

        if (!token) {
            return res.status(401).json({ error: 'Missing authentication token' })
        }

        const { data, error } = await req.supabase.auth.getUser(token)

        if (error || !data.user) {
            return res.status(401).json({ error: 'Invalid or expired token' })
        }

        // Ajouter l'utilisateur à la requête
        req.user = data.user
        next()
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Server error' })
    }
}

module.exports = { authenticated }