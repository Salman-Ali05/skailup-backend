const { supabaseAdmin } = require('../db/supabase')

const getPrograms = async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin.from('programs').select('*')
        if (error) {
            return res.status(400).json({ error: error.message })
        }
        return res.status(200).json(data)
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Server error' })
    }
}

module.exports = { getPrograms }
