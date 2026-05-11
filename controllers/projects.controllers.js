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

        // Extract unique IDs for related data
        const projectIds = unique(projectsData.map((project) => project.id))
        const tagProjectIds = unique(projectsData.map((project) => project.id_tag_project))
        const projectDetailIds = unique(projectsData.map((project) => project.id_project_detail))
        const programIds = []


        // Fetch related data in batches
        let tagProjectsData = []
        let projectDetailsData = []
        let projectProgramsData = []
        let programsData = []


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

        // Combine data into final program objects
        const programsById = new Map(programsData.map((program) => [program.id, program]))

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

            return {
                ...project,
                tag_project: tagProject ?? null,
                project_detail: projectDetail ?? null,
                project_programs: projectPrograms
            }
        })

        return res.status(200).json(projects)

    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Server error' })
    }

}

module.exports = { getProjects }
