const { supabaseAdmin } = require('../db/supabase')
const { all } = require('../routes/programs.routes')

const OPTIONS_SCHEMA = 'options_set'
const RELATIONAL_SCHEMA = 'relational'

const unique = (arr) => [...new Set(arr.filter(Boolean))]

const getPrograms = async (req, res) => {
    try {
        const { data: programsData, error: programsError } = await supabaseAdmin
            .from('programs')
            .select('*')

        if (programsError) {
            return res.status(400).json({ error: programsError.message })
        }

        if (!programsData || programsData.length === 0) {
            return res.status(200).json([])
        }

        // Extract unique IDs for related data
        const programIds = unique(programsData.map((program) => program.id))

        const structureIds = unique(
            programsData.map((program) => program.id_structure)
        )

        const tagParamStructureIds = unique(
            programsData.map((program) => program.id_param_structure)
        )

        const statusIds = unique(programsData.map((program) => program.id_status))

        // Fetch related data in batches
        let structuresData = []
        let statusesData = []
        let allStatusesData = []
        let tagParamStructuresData = []
        let allTagParamStructuresData = []
        let programContributorsData = []
        let programProjectsData = []
        let projectsData = []
        let contributorsData = []
        let contributorUserDetailsData = []

        // Fetch structures
        if (structureIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .from('structures')
                .select('*')
                .in('id', structureIds)

            if (error) {
                return res.status(400).json({ error: error.message })
            }

            structuresData = data ?? []
        }

        // Fetch statuses
        if (statusIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .schema(OPTIONS_SCHEMA)
                .from('os_status')
                .select('*')
                .in('id', statusIds)

            if (error) {
                return res.status(400).json({ error: error.message })
            }

            statusesData = data ?? []
        }

        // Fetch all status
        {
            const { data, error } = await supabaseAdmin
                .schema(OPTIONS_SCHEMA)
                .from('os_status')
                .select('*')

            if (error) {
                return res.status(400).json({ error: error.message })
            }

            allStatusesData = data ?? []
        }

        // Fetch tag_param_structures used by programs
        if (tagParamStructureIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .from('tag_param_structure')
                .select('*')
                .in('id', tagParamStructureIds)

            if (error) {
                return res.status(400).json({ error: error.message })
            }

            tagParamStructuresData = data ?? []
        }

        // Fetch all tag_param_structure
        {
            const { data, error } = await supabaseAdmin
                .from('tag_param_structure')
                .select('*')

            if (error) {
                return res.status(400).json({ error: error.message })
            }

            allTagParamStructuresData = data ?? []
        }

        // Fetch program_contributors
        if (programIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .schema(RELATIONAL_SCHEMA)
                .from('program_contributors')
                .select('*')
                .in('id_program', programIds)

            if (error) {
                return res.status(400).json({ error: error.message })
            }

            programContributorsData = data ?? []
        }

        // Fetch program_projects
        if (programIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .schema(RELATIONAL_SCHEMA)
                .from('program_projects')
                .select('*')
                .in('id_program', programIds)

            if (error) {
                return res.status(400).json({ error: error.message })
            }

            programProjectsData = data ?? []
        }

        // Fetch contributors used by program_contributors
        if (programContributorsData.length > 0) {
            const contributorIds = unique(
                programContributorsData.map((link) => link.id_contributor)
            )

            if (contributorIds.length > 0) {
                const { data, error } = await supabaseAdmin
                    .from('contributors')
                    .select('*, contributor_details:id_contributor_details (*)')
                    .in('id', contributorIds)

                if (error) {
                    return res.status(400).json({ error: error.message })
                }

                contributorsData = data ?? []

                const contributorAuthUserIds = unique(
                    contributorsData.map((contributor) => contributor.id_user)
                )

                if (contributorAuthUserIds.length > 0) {
                    const { data: userDetailsData, error: userDetailsError } =
                        await supabaseAdmin
                            .from('user_details')
                            .select('*')
                            .in('id_auth_user', contributorAuthUserIds)

                    if (userDetailsError) {
                        return res.status(400).json({ error: userDetailsError.message })
                    }

                    contributorUserDetailsData = userDetailsData ?? []
                }
            }
        }

        // Fetch projects
        if (programIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .from('projects')
                .select('*')

            if (error) {
                return res.status(400).json({ error: error.message })
            }

            projectsData = data ?? []
        }

        const contributors = contributorsData.map((contributor) => {
            const userDetails = contributorUserDetailsData.find(
                (details) => details.id_auth_user === contributor.id_user
            )

            return {
                ...contributor,
                user_details: userDetails ?? null
            }
        })

        const contributorById = new Map(
            contributors.map((contributor) => [contributor.id, contributor])
        )

        const programContributorsEnriched = programContributorsData.map((link) => {
            const contributor = contributorById.get(link.id_contributor) ?? null

            return {
                ...link,
                contributor,
                contributors: contributor
            }
        })

        // Combine data into final program objects
        const programs = programsData.map((program) => {
            const structure = structuresData.find(
                (item) => item.id === program.id_structure
            )
            const status = statusesData.find(
                (item) => item.id === program.id_status
            )
            const tag_param_structure = tagParamStructuresData.find(
                (item) => item.id === program.id_param_structure
            )
            const programContributors = programContributorsEnriched.filter(
                (link) => link.id_program === program.id
            )
            const programProjects = programProjectsData.filter(
                (link) => link.id_program === program.id
            )

            return {
                ...program,
                structure: structure ?? null,
                status: status ?? null,
                tag_param_structure: tag_param_structure ?? null,
                program_contributors: programContributors,
                program_projects: programProjects
            }
        })

        const statusOptions = unique(programs.map((program) => program.status))

        return res.status(200).json({
            programs,
            programProjects: programProjectsData,
            programContributors: programContributorsEnriched,
            projects: projectsData,
            contributors,
            statusOptions: allStatusesData,
            tagParamStructures: allTagParamStructuresData
        })
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Server error' })
    }
}

const getProgramsStatusCounts = async (req, res) => {
    try {
        const rawIds = req.query.statusIds || req.query.statusId || ''
        const statusIds = rawIds
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)

        if (statusIds.length === 0) {
            return res.status(400).json({ error: 'Missing statusIds query param' })
        }

        const { data, error } = await supabaseAdmin
            .from('programs')
            .select('id_status')
            .in('id_status', statusIds)

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        const counts = statusIds.reduce((acc, id) => {
            acc[id] = 0
            return acc
        }, {})

            ; (data ?? []).forEach((row) => {
                if (row?.id_status && counts[row.id_status] !== undefined) {
                    counts[row.id_status] += 1
                }
            })
            
        if (statusIds.length === 1) {
            return res.status(200).json({ count: counts[statusIds[0]] || 0 })
        }

        return res.status(200).json({ counts })
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

module.exports = {
    getPrograms,
    getProgramsStatusCounts,
    createProgram,
    updateProgram
}