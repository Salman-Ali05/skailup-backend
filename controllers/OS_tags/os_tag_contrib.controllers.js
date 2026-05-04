const { supabaseAdmin } = require('../../db/supabase')
const OPTIONS_SCHEMA = 'options_set'

const getOsTagContributors = async (req, res) => {
    let { os_tag1, os_tag2, os_tag3 } = {}
    try {
        const { data, error } = await supabaseAdmin
            .schema(OPTIONS_SCHEMA)
            .from('os_tag1_contributor')
            .select('*')
        if (error) {
            return res.status(400).json({ error: error.message })
        }
        os_tag1 = data || [];
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Server error' })
    }
    try {
        const { data, error } = await supabaseAdmin
            .schema(OPTIONS_SCHEMA)
            .from('os_tag2_contributor')
            .select('*')
        if (error) {
            return res.status(400).json({ error: error.message })
        }
        os_tag2 = data || [];
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Server error' })
    }
    try {
        const { data, error } = await supabaseAdmin
            .schema(OPTIONS_SCHEMA)
            .from('os_tag3_contributor')
            .select('*')
        if (error) {
            return res.status(400).json({ error: error.message })
        }
        os_tag3 = data || [];
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Server error' })
    }
    return res.json({ os_tag1, os_tag2, os_tag3 })
}

module.exports = { getOsTagContributors }
