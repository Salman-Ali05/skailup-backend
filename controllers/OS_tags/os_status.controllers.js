const { supabaseAdmin } = require('../../db/supabase')

const getStatus = async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin.schema('options_set').from('os_status').select('*')
        if (error) {
            return res.status(400).json({ error: error.message })
        }
        return res.status(200).json(data)
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Server error' })
    }
}

module.exports = { getStatus }