const { createClient } = require('@supabase/supabase-js')

const isAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid Authorization header' })
        }

        const accessToken = authHeader.replace('Bearer ', '')

        const supabaseUser = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            {
                global: {
                    headers: { Authorization: `Bearer ${accessToken}` }
                },
                auth: { persistSession: false, autoRefreshToken: false }
            }
        )

        const { data: userData, error: userError } =
            await supabaseUser.auth.getUser()

        if (userError || !userData?.user) {
            return res.status(401).json({ error: 'Invalid token' })
        }

        const userId = userData.user.id

        const { data: details, error: detailsError } = await supabaseUser
            .from('user_details')
            .select('is_admin_skailup')
            .eq('auth_user_id', userId)
            .maybeSingle()

        if (detailsError || !details) {
            return res.status(403).json({ error: 'Access denied' })
        }

        if (!details.is_admin_skailup) {
            return res.status(403).json({ error: 'Admin access required' })
        }

        req.user = userData.user
        req.isAdmin = true

        next()
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

module.exports = { isAdmin }
