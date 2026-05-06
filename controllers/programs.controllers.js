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

const createProgram = async (req, res) => {
    try {
        const { id_param_structure, description, date_start, date_end, id_status } = req.body

        if (!id_param_structure || !description || !date_start || !date_end || !id_status) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        const { data, error } = await supabaseAdmin
            .from('programs')
            .insert([{ id_param_structure, description, date_start, date_end, id_status }])
            .select('*')
            .single()

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        return res.status(201).json(data)
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Server error' })
    }
}

const updateProgram = async (req, res) => {
    try {
        const { id_param_structure, description, date_start, date_end, id_status } = req.body

        if (!id_param_structure || !description || !date_start || !date_end || !id_status) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        const { data, error } = await supabaseAdmin
            .from('programs')
            .update({ id_param_structure, description, date_start, date_end, id_status })
            .eq('id', req.params.id)
            .select('*')
            .single()

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        return res.status(201).json(data)
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Server error' })
    }
}

module.exports = { getPrograms, createProgram, updateProgram }
