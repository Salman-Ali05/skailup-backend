const { supabaseAdmin } = require('../db/supabase')

const OPTIONS_SCHEMA = 'options_set'
const RELATIONAL_SCHEMA = 'relational'
const AUTH_SCHEMA = 'auth'


const unique = (items) => [...new Set(items.filter((value) => value != null))]

const getProjects = async (req, res) => {
    try {
        const { data: projectsData, error: projectsError } = await supabaseAdmin
            .from('projects')
            .select('*')

        if (projectsError) {
            return res.status(400).json({ error: projectsError.message })
        }

        if (!projectsData || projectsData.length === 0) {
            return res.status(200).json([])
        }

        // Extract unique IDs for related data
        const projectIds = unique(projectsData.map((project) => project.id))
        const tagProjectIds = unique(projectsData.map((project) => project.id_tag_project))
        const projectDetailIds = unique(projectsData.map((project) => project.id_project_detail))
        const programIds = []
        const usersIds = []


        // Fetch related data in batches
        let tagProjectsData = []
        let projectDetailsData = []
        let projectProgramsData = []
        let programsData = []
        let projectUsersData = []
        let usersData = []


        // Fetch structures
        if (tagProjectIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .schema(OPTIONS_SCHEMA)
                .from('os_tag1_project')
                .select('*')
                .in('id', tagProjectIds)

            if (error) {
                return res.status(400).json({ error: error.message })
            }

            tagProjectsData = data ?? []
        }

        // Fetch project details
        if (projectDetailIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .from('project_details')
                .select('*')
                .in('id', projectDetailIds)

            if (error) {
                return res.status(400).json({ error: error.message })
            }

            projectDetailsData = data ?? []
        }

        // Fetch project_programs
        if (projectIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .schema(RELATIONAL_SCHEMA)
                .from('project_programs')
                .select('*')
                .in('id_project', projectIds)

            if (error) {
                return res.status(400).json({ error: error.message })
            }

            projectProgramsData = data ?? []
        }

        // Fetch project_users
        if (projectIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .schema(RELATIONAL_SCHEMA)
                .from('project_users')
                .select('*')
                .in('id_project', projectIds)

            if (error) {
                return res.status(400).json({ error: error.message })
            }

            projectUsersData = data ?? []
        }

        // Fetch programs
        const linkedProgramIds = unique(projectProgramsData.map((link) => link.id_program))
        if (linkedProgramIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .from('programs')
                .select('*')
            .in('id', linkedProgramIds)

            if (error) {
                return res.status(400).json({ error: error.message })
            }

            programsData = data ?? []
        }

        // Fetch users
        const linkedUserIds = unique(projectUsersData.map((link) => link.id_user))
        if (linkedUserIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .schema(AUTH_SCHEMA)
                .from('users')
                .select('*')
            .in('id', linkedUserIds)

            if (error) {
                return res.status(400).json({ error: error.message })
            }

            usersData = data ?? []
        }

        // Combine data into final program objects
        const programsById = new Map(programsData.map((program) => [program.id, program]))
        const usersById = new Map(usersData.map((user) => [user.id, user]))

        const projects = projectsData.map((project) => {
            const tagProject = tagProjectsData.find(
                (item) => item.id === project.id_tag_project
            )
            const projectDetail = projectDetailsData.find(
                (item) => item.id === project.id_project_detail
            )
            const projectPrograms = projectProgramsData
                .filter((link) => link.id_project === project.id)
                .map((link) => ({
                    ...link,
                    program: programsById.get(link.id_program) ?? null
                }))
            const projectUsers = projectUsersData
                .filter((link) => link.id_project === project.id)
                .map((link) => ({
                    ...link,
                    user: usersById.get(link.id_user) ?? null
                }))

            return {
                ...project,
                tag_project: tagProject ?? null,
                project_detail: projectDetail ?? null,
                project_programs: projectPrograms,
                project_users: projectUsers
            }
        })

        return res.status(200).json(projects)

    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Server error' })
    }

    const getProjectsStatusCounts = async (req, res) => {
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
            .from('projects')
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

}

module.exports = { getProjects }
