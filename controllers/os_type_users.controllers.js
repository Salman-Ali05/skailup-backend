const { supabaseAdmin } = require('../db/supabase')

const getOS_type_users = async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin.from('os_type_users').select('*')
        if (error) {
            return res.status(400).json({ error: error.message })
        }
        return res.status(200).json(data)
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Server error' })
    }
}

module.exports = { getOS_type_users }
