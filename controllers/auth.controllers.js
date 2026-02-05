const { createClient } = require('@supabase/supabase-js')

const login = async (req, res) => {
    try {
        const { email, password } = req.body
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' })
        }
        const { data, error } = await req.supabase.auth.signInWithPassword({
            email,
            password
        })
        if (error) return res.status(400).json({ error: error.message })

        const accessToken = data.session?.access_token ?? null
        const refreshToken = data.session?.refresh_token ?? null

        if (!accessToken) {
            return res.status(400).json({ error: 'No access token returned by Supabase' })
        }
        const supabaseUser = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            {
                global: { headers: { Authorization: `Bearer ${accessToken}` } }
            }
        )
        const { data: detailsData, error: detailsError } = await supabaseUser
            .from('user_details')
            .select(`*,os_type_user:os_type_users (*)`)
            .eq('auth_user_id', data.user.id)
            .maybeSingle()

        if (detailsError) {
            return res.status(400).json({ error: detailsError.message })
        }
        return res.status(200).json({
            user: { id: data.user.id, email: data.user.email },
            session: {
                access_token: accessToken,
                refresh_token: refreshToken
            },
            user_details: detailsData,
        })
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

const logout = async (req, res) => {
    try {
        const { error } = await req.supabase.auth.signOut()
        if (error) return res.status(400).json({ error: error.message })

        return res.status(200).json({ message: 'Logged out successfully' })
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

module.exports = { login, logout }