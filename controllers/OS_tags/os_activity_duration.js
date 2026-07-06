const { supabaseAdmin } = require('../../db/supabase')

const getOSActivityDuration = async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin.schema('options_set').from('os_activity_duration').select('*')
        if (error) {
            return res.status(400).json({ error: error.message })
        }
        return res.status(200).json(data)
    }
    catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Server error' })
    }
}

module.exports = { getOSActivityDuration }

