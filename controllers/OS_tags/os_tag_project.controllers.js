const { supabaseAdmin } = require('../../db/supabase')
const OPTIONS_SCHEMA = 'options_set'

const getOsTagProject = async (req, res) => {
    let os_tag_project = []
    try {
        const { data, error } = await supabaseAdmin
            .schema(OPTIONS_SCHEMA)
            .from('os_tag1_project')
            .select('*')
        if (error) {
            return res.status(400).json({ error: error.message })
        }
        os_tag_project = data || [];
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Server error' })
    }
    return res.json({ os_tag_project })
}

module.exports = { getOsTagProject }
