const { supabaseAdmin } = require('../db/supabase')

const OPTIONS_SCHEMA = 'options_set'
const RELATIONAL_SCHEMA = 'relational'

const unique = (arr) => [...new Set(arr.filter(Boolean))]

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

const getPrograms = async (req, res) => {
    try {
        const { data: currentUserDetails, error: currentUserError } =
            await getCurrentUserDetails(req);

        if (currentUserError) {
            return res.status(401).json({ error: currentUserError.message });
        }

        const id_structure = currentUserDetails.id_structure;

        const { data: programsData, error: programsError } = await supabaseAdmin
            .from("programs")
            .select("*")
            .eq("id_structure", id_structure);

        if (programsError) {
            return res.status(400).json({ error: programsError.message });
        }

        const programsList = programsData ?? [];
        const programIds = unique(programsList.map((program) => program.id));

        const { data: structureData, error: structureError } = await supabaseAdmin
            .from("structures")
            .select("*")
            .eq("id", id_structure)
            .maybeSingle();

        if (structureError) {
            return res.status(400).json({ error: structureError.message });
        }

        const { data: statusOptionsData, error: statusesError } = await supabaseAdmin
            .schema(OPTIONS_SCHEMA)
            .from("os_status")
            .select("*");

        if (statusesError) {
            return res.status(400).json({ error: statusesError.message });
        }

        const statusOptions = statusOptionsData ?? [];

        const { data: tagParamStructuresData, error: tagParamStructuresError } =
            await supabaseAdmin
                .from("tag_param_structure")
                .select("*");

        if (tagParamStructuresError) {
            return res.status(400).json({ error: tagParamStructuresError.message });
        }

        const tagParamStructures = tagParamStructuresData ?? [];

        const { data: projectsData, error: projectsError } = await supabaseAdmin
            .from("projects")
            .select("*")
            .eq("id_structure", id_structure);

        if (projectsError) {
            return res.status(400).json({ error: projectsError.message });
        }

        const projects = projectsData ?? [];


        const { data: contributorsData, error: contributorsError } =
            await supabaseAdmin
                .from("contributors")
                .select("*, contributor_details:id_contributor_details (*)")
                .eq("id_structure", id_structure);

        if (contributorsError) {
            return res.status(400).json({ error: contributorsError.message });
        }

        const contributors = contributorsData ?? [];
        const contributorAuthUserIds = unique(
            contributors
                .map((contributor) => contributor.id_user)
                .filter(Boolean)
        );

        let contributorUserDetailsData = [];

        if (contributorAuthUserIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .from("user_details")
                .select("*")
                .in("id_auth_user", contributorAuthUserIds);

            if (error) {
                return res.status(400).json({ error: error.message });
            }

            contributorUserDetailsData = data ?? [];
        }

        let programContributorsData = [];

        if (programIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .schema(RELATIONAL_SCHEMA)
                .from("program_contributors")
                .select("*")
                .in("id_program", programIds);

            if (error) {
                return res.status(400).json({ error: error.message });
            }

            programContributorsData = data ?? [];
        }

        let programProjectsData = [];

        if (programIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .schema(RELATIONAL_SCHEMA)
                .from("program_projects")
                .select("*")
                .in("id_program", programIds);

            if (error) {
                return res.status(400).json({ error: error.message });
            }

            programProjectsData = data ?? [];
        }

        const contributorsWithDetails = contributors.map((contributor) => {
            const userDetails = contributorUserDetailsData.find(
                (details) => details.id_auth_user === contributor.id_user
            );

            return {
                ...contributor,
                user_details: userDetails ?? null,
            };
        });

        const statusById = new Map(
            statusOptions.map((status) => [status.id, status])
        );

        const tagParamStructureById = new Map(
            tagParamStructures.map((tag) => [tag.id, tag])
        );

        const contributorById = new Map(
            contributorsWithDetails.map((contributor) => [
                contributor.id,
                contributor,
            ])
        );

        const projectById = new Map(
            projects.map((project) => [project.id, project])
        );

        const programContributors = programContributorsData.map((link) => {
            const contributor = contributorById.get(link.id_contributor) ?? null;

            return {
                ...link,
                contributor,
                contributors: contributor,
            };
        });

        const programProjects = programProjectsData.map((link) => {
            const project = projectById.get(link.id_project) ?? null;

            return {
                ...link,
                project,
                projects: project,
            };
        });

        const programs = programsList.map((program) => {
            const programId = program.id;

            return {
                ...program,
                structure: structureData ?? null,
                status: statusById.get(program.id_status) ?? null,
                tag_param_structure:
                    tagParamStructureById.get(program.id_param_structure) ?? null,
                program_contributors: programContributors.filter(
                    (link) => link.id_program === programId
                ),
                program_projects: programProjects.filter(
                    (link) => link.id_program === programId
                ),
            };
        });

        return res.status(200).json({
            programs,
            programProjects,
            programContributors,
            projects,
            contributors: contributorsWithDetails,
            statusOptions,
            tagParamStructures,
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Server error" });
    }
};

const getProgramsStatusCounts = async (req, res) => {
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
            .from('programs')
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
        const { data: currentUserDetails, error: currentUserError } =
            await getCurrentUserDetails(req)

        if (currentUserError) {
            return res
                .status(currentUserError.status)
                .json({ error: currentUserError.message })
        }

        const id_structure = currentUserDetails.id_structure

        const {
            id_param_structure,
            description,
            date_start,
            date_end,
            id_status
        } = req.body

        if (!id_param_structure || !description || !date_start || !date_end || !id_status) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        const { data, error } = await supabaseAdmin
            .from('programs')
            .insert({
                id_structure,
                id_param_structure,
                description,
                date_start,
                date_end,
                id_status
            })
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
        const { data: currentUserDetails, error: currentUserError } =
            await getCurrentUserDetails(req)

        if (currentUserError) {
            return res
                .status(currentUserError.status)
                .json({ error: currentUserError.message })
        }

        const id_structure = currentUserDetails.id_structure

        const {
            id_param_structure,
            description,
            date_start,
            date_end,
            id_status
        } = req.body

        if (!id_param_structure || !description || !date_start || !date_end || !id_status) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        const { data, error } = await supabaseAdmin
            .from('programs')
            .update({
                id_param_structure,
                description,
                date_start,
                date_end,
                id_status
            })
            .eq('id', req.params.id)
            .eq('id_structure', id_structure)
            .select('*')
            .maybeSingle()

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        if (!data) {
            return res.status(404).json({ error: 'Program not found in current structure' })
        }

        return res.status(200).json(data)
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