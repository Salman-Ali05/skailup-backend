const { supabaseAdmin } = require('../db/supabase')

const OPTIONS_SCHEMA = 'options_set'
const RELATIONAL_SCHEMA = 'relational'

const unique = (items) => [...new Set(items.filter((value) => value != null))]

const getCurrentUserDetails = async (req) => {
    const currentAuthUserId = req.user?.id

    if (!currentAuthUserId) {
        return {
            data: null,
            error: {
                status: 401,
                message: 'Unauthorized'
            }
        }
    }

    const { data, error } = await supabaseAdmin
        .from('user_details')
        .select('id, id_structure')
        .eq('id_auth_user', currentAuthUserId)
        .maybeSingle()

    if (error) {
        return {
            data: null,
            error: {
                status: 400,
                message: error.message
            }
        }
    }

    if (!data?.id_structure) {
        return {
            data: null,
            error: {
                status: 400,
                message: 'Current user has no structure'
            }
        }
    }

    return {
        data,
        error: null
    }
}

const getProjects = async (req, res) => {
    try {
        const { data: currentUserDetails, error: currentUserError } =
            await getCurrentUserDetails(req)

        if (currentUserError) {
            return res
                .status(currentUserError.status)
                .json({ error: currentUserError.message })
        }

        const id_structure = currentUserDetails.id_structure

        const { data: projectsData, error: projectsError } = await supabaseAdmin
            .from('projects')
            .select('*')
            .eq('id_structure', id_structure)

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
        let userDetailsData = []

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

        const linkedProgramIds = unique(
            projectProgramsData.map((link) => link.id_program)
        )

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

        const linkedUserIds = unique(
            projectUsersData.map((link) => link.id_user)
        )

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

        if (linkedUserIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .from('user_details')
                .select('*')
                .in('id_auth_user', linkedUserIds)

            if (error) {
                return res.status(400).json({ error: error.message })
            }

            userDetailsData = data ?? []
        }

        const projects = projectsData.map((project) => {
            const tagProject = tagProjectsData.find(
                (tag) => tag.id === project.id_tag_project
            )

            const projectDetail = projectDetailsData.find(
                (detail) => detail.id === project.id_project_detail
            )

            const projectPrograms = projectProgramsData
                .filter((link) => link.id_project === project.id)
                .map((link) => {
                    const program = programsData.find(
                        (program) => program.id === link.id_program
                    )

                    return {
                        ...link,
                        program: program ?? null
                    }
                })

            const projectUsers = projectUsersData
                .filter((link) => link.id_project === project.id)
                .map((link) => {
                    const authUser = usersData.find(
                        (user) => user.id === link.id_user
                    )

                    const userDetails = userDetailsData.find(
                        (details) => details.id_auth_user === link.id_user
                    )

                    return {
                        ...link,
                        user: authUser
                            ? {
                                id: authUser.id,
                                email: authUser.email,
                                created_at: authUser.created_at,
                                last_sign_in_at: authUser.last_sign_in_at
                            }
                            : null,
                        user_details: userDetails ?? null
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
        const { data: currentUserDetails, error: currentUserError } =
            await getCurrentUserDetails(req)

        if (currentUserError) {
            return res
                .status(currentUserError.status)
                .json({ error: currentUserError.message })
        }

        const id_structure = currentUserDetails.id_structure

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
            .eq('id_structure', id_structure)
            .in('id_status', statusIds)

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        const counts = statusIds.reduce((acc, id) => {
            acc[id] = 0
            return acc
        }, {})

        ;(data ?? []).forEach((row) => {
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