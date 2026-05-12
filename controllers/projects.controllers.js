const { supabaseAdmin } = require('../db/supabase')

const OPTIONS_SCHEMA = 'options_set'
const RELATIONAL_SCHEMA = 'relational'

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

        const projectIds = unique(projectsData.map((project) => project.id))
        const tagProjectIds = unique(projectsData.map((project) => project.id_tag_project))
        const projectDetailIds = unique(projectsData.map((project) => project.id_project_detail))

        let tagProjectsData = []
        let projectDetailsData = []
        let projectProgramsData = []
        let programsData = []
        let projectUsersData = []
        let usersData = []

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

        const linkedUserIds = unique(projectUsersData.map((link) => link.id_user))

        if (linkedUserIds.length > 0) {
            const { data: authData, error: authError } =
                await supabaseAdmin.auth.admin.listUsers()

            if (authError) {
                return res.status(400).json({ error: authError.message })
            }

            usersData = authData.users.filter((user) =>
                linkedUserIds.includes(user.id)
            )
        }

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
                .map((link) => {
                    const authUser = usersById.get(link.id_user)

                    return {
                        ...link,
                        user: authUser
                            ? {
                                id: authUser.id,
                                email: authUser.email,
                                created_at: authUser.created_at,
                                last_sign_in_at: authUser.last_sign_in_at
                            }
                            : null
                    }
                })

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

module.exports = {
    getProjects,
    getProjectsStatusCounts
}