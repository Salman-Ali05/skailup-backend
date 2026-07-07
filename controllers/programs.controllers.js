const { supabaseAdmin } = require("../db/supabase");

const OPTIONS_SCHEMA = "options_set";
const RELATIONAL_SCHEMA = "relational";

const unique = (arr) => [...new Set(arr.filter(Boolean))];

const getCurrentUserDetails = async (req) => {
    const currentAuthUserId = req.user?.id;

    if (!currentAuthUserId) {
        return {
            data: null,
            error: {
                status: 401,
                message: "Unauthorized",
            },
        };
    }

    const { data, error } = await supabaseAdmin
        .from("user_details")
        .select("id, id_structure")
        .eq("id_auth_user", currentAuthUserId)
        .maybeSingle();

    if (error) {
        return {
            data: null,
            error: {
                status: 400,
                message: error.message,
            },
        };
    }

    if (!data?.id_structure) {
        return {
            data: null,
            error: {
                status: 400,
                message: "Current user has no structure",
            },
        };
    }

    return {
        data,
        error: null,
    };
};

const cleanString = (value) => {
    if (typeof value !== "string") return "";
    return value.trim();
};

const intersectIds = (currentIds, nextIds) => {
    if (currentIds === null) {
        return unique(nextIds);
    }

    const nextIdSet = new Set(nextIds.map(String));

    return currentIds.filter((id) => {
        return nextIdSet.has(String(id));
    });
};

const getProgramIdsFromRelation = async ({
    table,
    filterColumn,
    filterValue,
}) => {
    const { data, error } = await supabaseAdmin
        .schema(RELATIONAL_SCHEMA)
        .from(table)
        .select("id_program")
        .eq(filterColumn, filterValue);

    if (error) {
        return {
            data: null,
            error,
        };
    }

    return {
        data: unique((data ?? []).map((link) => link.id_program)),
        error: null,
    };
};

const applyProgramFilters = (
    query,
    {
        idStructure,
        statusId,
        allowedStatusIds,
        cohortName,
        matchingTagIds,
        relationalProgramIds,
    }
) => {
    query = query.eq("id_structure", idStructure);

    /*
     * Si le frontend envoie l'onglet actif, on ne récupère
     * que ce statut.
     *
     * Sinon, on limite quand même la récupération aux statuts
     * Open et Closed.
     */
    if (statusId) {
        query = query.eq("id_status", statusId);
    } else if (allowedStatusIds.length > 0) {
        query = query.in("id_status", allowedStatusIds);
    }

    if (cohortName) {
        query = query.ilike("description", `%${cohortName}%`);
    }

    if (matchingTagIds !== null) {
        query = query.in("id_param_structure", matchingTagIds);
    }

    if (relationalProgramIds !== null) {
        query = query.in("id", relationalProgramIds);
    }

    return query;
};

const getPrograms = async (req, res) => {
    try {
        const { data: currentUserDetails, error: currentUserError } =
            await getCurrentUserDetails(req);

        if (currentUserError) {
            return res
                .status(currentUserError.status || 401)
                .json({ error: currentUserError.message });
        }

        const id_structure = currentUserDetails.id_structure;

        /*
         * Liste blanche des filtres acceptés.
         */
        const statusId = cleanString(req.query.statusId);
        const programName = cleanString(req.query.programName);
        const cohortName = cleanString(req.query.cohortName);

        const contributorId = cleanString(req.query.contributorId);
        const projectId = cleanString(req.query.projectId);
        const activityId = cleanString(req.query.activityId);

        const rawPage = cleanString(req.query.page);
        const rawLimit = cleanString(req.query.limit);

        /*
         * La pagination est optionnelle pour ne pas casser
         * immédiatement le frontend actuel.
         */
        const paginationEnabled = Boolean(rawPage || rawLimit);

        const page = Math.max(Number(rawPage) || 1, 1);

        const limit = Math.min(
            Math.max(Number(rawLimit) || 25, 1),
            100
        );

        const offset = (page - 1) * limit;

        /*
         * Données de référence utilisées pour :
         * - valider l'onglet Open/Closed ;
         * - chercher le nom du programme dans les tags ;
         * - enrichir la réponse.
         */
        const [
            statusResult,
            tagParamResult,
            structureResult,
        ] = await Promise.all([
            supabaseAdmin
                .schema(OPTIONS_SCHEMA)
                .from("os_status")
                .select("*"),

            supabaseAdmin
                .from("tag_param_structure")
                .select("*")
                .eq("id_structure", id_structure),

            supabaseAdmin
                .from("structures")
                .select("*")
                .eq("id", id_structure)
                .maybeSingle(),
        ]);

        if (statusResult.error) {
            return res.status(400).json({
                error: statusResult.error.message,
            });
        }

        if (tagParamResult.error) {
            return res.status(400).json({
                error: tagParamResult.error.message,
            });
        }

        if (structureResult.error) {
            return res.status(400).json({
                error: structureResult.error.message,
            });
        }

        const statusOptions = statusResult.data ?? [];
        const tagParamStructures = tagParamResult.data ?? [];
        const structureData = structureResult.data ?? null;

        const openStatus = statusOptions.find((status) => {
            return status.code === "Open";
        });

        const closedStatus = statusOptions.find((status) => {
            return status.code === "Closed";
        });

        const allowedStatusIds = [
            openStatus?.id,
            closedStatus?.id,
        ].filter(Boolean);

        /*
         * Le frontend ne doit pas pouvoir envoyer un autre statut
         * sur cette page.
         */
        if (
            statusId &&
            !allowedStatusIds.some((allowedId) => {
                return String(allowedId) === String(statusId);
            })
        ) {
            return res.status(400).json({
                error: "Invalid statusId. Only Open and Closed are allowed",
            });
        }

        /*
         * Filtre "Programmes".
         *
         * L'utilisateur cherche dans tag_param_structure.label,
         * tandis que programs stocke seulement id_param_structure.
         */
        let matchingTagIds = null;

        if (programName) {
            const normalizedProgramName =
                programName.toLocaleLowerCase("fr");

            matchingTagIds = tagParamStructures
                .filter((tag) => {
                    const label =
                        tag.label ||
                        tag.name ||
                        tag.description ||
                        tag.tag ||
                        tag.value ||
                        "";

                    return String(label)
                        .toLocaleLowerCase("fr")
                        .includes(normalizedProgramName);
                })
                .map((tag) => tag.id);
        }

        /*
         * Filtres relationnels.
         *
         * Chaque filtre retourne une liste d'IDs de programmes.
         * En cas de plusieurs filtres, on fait une intersection.
         */
        let relationalProgramIds = null;

        if (contributorId) {
            const {
                data: contributorProgramIds,
                error: contributorProgramsError,
            } = await getProgramIdsFromRelation({
                table: "program_contributors",
                filterColumn: "id_contributor",
                filterValue: contributorId,
            });

            if (contributorProgramsError) {
                return res.status(400).json({
                    error: contributorProgramsError.message,
                });
            }

            relationalProgramIds = intersectIds(
                relationalProgramIds,
                contributorProgramIds
            );
        }

        if (projectId) {
            const {
                data: projectProgramIds,
                error: projectProgramsError,
            } = await getProgramIdsFromRelation({
                table: "program_projects",
                filterColumn: "id_project",
                filterValue: projectId,
            });

            if (projectProgramsError) {
                return res.status(400).json({
                    error: projectProgramsError.message,
                });
            }

            relationalProgramIds = intersectIds(
                relationalProgramIds,
                projectProgramIds
            );
        }

        if (activityId) {
            const {
                data: activityProgramIds,
                error: activityProgramsError,
            } = await getProgramIdsFromRelation({
                table: "program_activities",
                filterColumn: "id_activity",
                filterValue: activityId,
            });

            if (activityProgramsError) {
                return res.status(400).json({
                    error: activityProgramsError.message,
                });
            }

            relationalProgramIds = intersectIds(
                relationalProgramIds,
                activityProgramIds
            );
        }

        /*
         * Quand un filtre ne correspond à aucun tag ou aucune
         * relation, inutile d'interroger programs.
         */
        const hasNoMatchingTag =
            matchingTagIds !== null &&
            matchingTagIds.length === 0;

        const hasNoRelationalProgram =
            relationalProgramIds !== null &&
            relationalProgramIds.length === 0;

        if (hasNoMatchingTag || hasNoRelationalProgram) {
            return res.status(200).json({
                programs: [],
                programProjects: [],
                programContributors: [],
                projects: [],
                contributors: [],
                statusOptions,
                tagParamStructures,

                statusCounts: {
                    open: 0,
                    closed: 0,
                    byId: {
                        ...(openStatus?.id
                            ? { [String(openStatus.id)]: 0 }
                            : {}),
                        ...(closedStatus?.id
                            ? { [String(closedStatus.id)]: 0 }
                            : {}),
                    },
                },

                pagination: {
                    enabled: paginationEnabled,
                    page,
                    limit: paginationEnabled ? limit : 0,
                    total: 0,
                    totalPages: 0,
                },

                appliedFilters: {
                    statusId: statusId || null,
                    programName: programName || null,
                    cohortName: cohortName || null,
                    contributorId: contributorId || null,
                    projectId: projectId || null,
                    activityId: activityId || null,
                },
            });
        }

        /*
         * Requête principale.
         *
         * Elle prend en compte le statut de l'onglet actif.
         */
        let programsQuery = supabaseAdmin
            .from("programs")
            .select("*", { count: "exact" });

        programsQuery = applyProgramFilters(programsQuery, {
            idStructure: id_structure,
            statusId,
            allowedStatusIds,
            cohortName,
            matchingTagIds,
            relationalProgramIds,
        });

        programsQuery = programsQuery.order("created_at", {
            ascending: false,
        });

        if (paginationEnabled) {
            programsQuery = programsQuery.range(
                offset,
                offset + limit - 1
            );
        }

        /*
         * Compteurs Open et Closed.
         *
         * Ils reprennent les filtres Programme, Cohorte,
         * Contributeur, Projet et Activité.
         *
         * Ils ignorent volontairement statusId afin que les deux
         * onglets gardent leurs vrais compteurs.
         */
        let openCountQuery = supabaseAdmin
            .from("programs")
            .select("id", {
                count: "exact",
                head: true,
            });

        openCountQuery = applyProgramFilters(openCountQuery, {
            idStructure: id_structure,
            statusId: openStatus?.id || null,
            allowedStatusIds,
            cohortName,
            matchingTagIds,
            relationalProgramIds,
        });

        let closedCountQuery = supabaseAdmin
            .from("programs")
            .select("id", {
                count: "exact",
                head: true,
            });

        closedCountQuery = applyProgramFilters(closedCountQuery, {
            idStructure: id_structure,
            statusId: closedStatus?.id || null,
            allowedStatusIds,
            cohortName,
            matchingTagIds,
            relationalProgramIds,
        });

        const [
            programsResult,
            openCountResult,
            closedCountResult,
        ] = await Promise.all([
            programsQuery,
            openCountQuery,
            closedCountQuery,
        ]);

        if (programsResult.error) {
            return res.status(400).json({
                error: programsResult.error.message,
            });
        }

        if (openCountResult.error) {
            return res.status(400).json({
                error: openCountResult.error.message,
            });
        }

        if (closedCountResult.error) {
            return res.status(400).json({
                error: closedCountResult.error.message,
            });
        }

        const programsList = programsResult.data ?? [];
        const total = programsResult.count ?? programsList.length;

        const openCount = openCountResult.count ?? 0;
        const closedCount = closedCountResult.count ?? 0;

        const programIds = unique(
            programsList.map((program) => program.id)
        );

        /*
         * On récupère maintenant uniquement les relations
         * nécessaires aux programmes réellement affichés.
         */
        let programProjectsData = [];
        let programContributorsData = [];

        if (programIds.length > 0) {
            const [
                programProjectsResult,
                programContributorsResult,
            ] = await Promise.all([
                supabaseAdmin
                    .schema(RELATIONAL_SCHEMA)
                    .from("program_projects")
                    .select("*")
                    .in("id_program", programIds),

                supabaseAdmin
                    .schema(RELATIONAL_SCHEMA)
                    .from("program_contributors")
                    .select("*")
                    .in("id_program", programIds),
            ]);

            if (programProjectsResult.error) {
                return res.status(400).json({
                    error: programProjectsResult.error.message,
                });
            }

            if (programContributorsResult.error) {
                return res.status(400).json({
                    error: programContributorsResult.error.message,
                });
            }

            programProjectsData =
                programProjectsResult.data ?? [];

            programContributorsData =
                programContributorsResult.data ?? [];
        }

        /*
         * On récupère uniquement les projets et contributeurs
         * présents dans les relations précédentes.
         */
        const projectIds = unique(
            programProjectsData.map((link) => link.id_project)
        );

        const contributorIds = unique(
            programContributorsData.map(
                (link) => link.id_contributor
            )
        );

        let projects = [];
        let contributors = [];

        if (projectIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .from("projects")
                .select("*")
                .eq("id_structure", id_structure)
                .in("id", projectIds);

            if (error) {
                return res.status(400).json({
                    error: error.message,
                });
            }

            projects = data ?? [];
        }

        if (contributorIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .from("contributors")
                .select(
                    "*, contributor_details:id_contributor_details (*)"
                )
                .eq("id_structure", id_structure)
                .in("id", contributorIds);

            if (error) {
                return res.status(400).json({
                    error: error.message,
                });
            }

            contributors = data ?? [];
        }

        /*
         * Détails utilisateurs des contributeurs récupérés.
         */
        const contributorAuthUserIds = unique(
            contributors.map((contributor) => contributor.id_user)
        );

        let contributorUserDetailsData = [];

        if (contributorAuthUserIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .from("user_details")
                .select("*")
                .in(
                    "id_auth_user",
                    contributorAuthUserIds
                );

            if (error) {
                return res.status(400).json({
                    error: error.message,
                });
            }

            contributorUserDetailsData = data ?? [];
        }

        const contributorsWithDetails = contributors.map(
            (contributor) => {
                const userDetails =
                    contributorUserDetailsData.find((details) => {
                        return (
                            String(details.id_auth_user) ===
                            String(contributor.id_user)
                        );
                    });

                return {
                    ...contributor,
                    user_details: userDetails ?? null,
                };
            }
        );

        /*
         * Maps d'enrichissement.
         */
        const statusById = new Map(
            statusOptions.map((status) => [
                String(status.id),
                status,
            ])
        );

        const tagParamStructureById = new Map(
            tagParamStructures.map((tag) => [
                String(tag.id),
                tag,
            ])
        );

        const contributorById = new Map(
            contributorsWithDetails.map((contributor) => [
                String(contributor.id),
                contributor,
            ])
        );

        const projectById = new Map(
            projects.map((project) => [
                String(project.id),
                project,
            ])
        );

        const programContributors = programContributorsData.map(
            (link) => {
                const contributor =
                    contributorById.get(
                        String(link.id_contributor)
                    ) ?? null;

                return {
                    ...link,
                    contributor,
                    contributors: contributor,
                };
            }
        );

        const programProjects = programProjectsData.map((link) => {
            const project =
                projectById.get(String(link.id_project)) ?? null;

            return {
                ...link,
                project,
                projects: project,
            };
        });

        const programs = programsList.map((program) => {
            const programId = String(program.id);

            const relatedContributors =
                programContributors.filter((link) => {
                    return (
                        String(link.id_program) === programId
                    );
                });

            const relatedProjects =
                programProjects.filter((link) => {
                    return (
                        String(link.id_program) === programId
                    );
                });

            return {
                ...program,

                structure: structureData,

                status:
                    statusById.get(
                        String(program.id_status)
                    ) ?? null,

                tag_param_structure:
                    tagParamStructureById.get(
                        String(program.id_param_structure)
                    ) ?? null,

                program_contributors: relatedContributors,
                program_projects: relatedProjects,

                contributors: relatedContributors
                    .map((link) => link.contributor)
                    .filter(Boolean),

                projects: relatedProjects
                    .map((link) => link.project)
                    .filter(Boolean),
            };
        });

        const totalPages = paginationEnabled
            ? Math.ceil(total / limit)
            : total > 0
                ? 1
                : 0;

        return res.status(200).json({
            programs,

            programProjects,
            programContributors,

            projects,
            contributors: contributorsWithDetails,

            statusOptions,
            tagParamStructures,

            statusCounts: {
                open: openCount,
                closed: closedCount,

                byId: {
                    ...(openStatus?.id
                        ? {
                            [String(openStatus.id)]:
                                openCount,
                        }
                        : {}),

                    ...(closedStatus?.id
                        ? {
                            [String(closedStatus.id)]:
                                closedCount,
                        }
                        : {}),
                },
            },

            pagination: {
                enabled: paginationEnabled,
                page,
                limit: paginationEnabled
                    ? limit
                    : total,
                total,
                totalPages,
            },

            appliedFilters: {
                statusId: statusId || null,
                programName: programName || null,
                cohortName: cohortName || null,
                contributorId: contributorId || null,
                projectId: projectId || null,
                activityId: activityId || null,
            },
        });
    } catch (e) {
        console.error(e);

        return res.status(500).json({
            error: e.message || "Server error",
        });
    }
};

const getProgramsStatusCounts = async (req, res) => {
    try {
        const { data: currentUserDetails, error: currentUserError } =
            await getCurrentUserDetails(req);

        if (currentUserError) {
            return res
                .status(currentUserError.status || 401)
                .json({ error: currentUserError.message });
        }

        const id_structure = currentUserDetails.id_structure;

        const rawIds =
            req.query.statusIds ||
            req.query.statusId ||
            "";

        const statusIds = rawIds
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);

        if (statusIds.length === 0) {
            return res.status(400).json({
                error: "Missing statusIds query param",
            });
        }

        const { data, error } = await supabaseAdmin
            .from("programs")
            .select("id_status")
            .eq("id_structure", id_structure)
            .in("id_status", statusIds);

        if (error) {
            return res.status(400).json({
                error: error.message,
            });
        }

        const counts = statusIds.reduce((acc, id) => {
            acc[id] = 0;
            return acc;
        }, {});

        (data ?? []).forEach((row) => {
            if (
                row?.id_status &&
                counts[row.id_status] !== undefined
            ) {
                counts[row.id_status] += 1;
            }
        });

        if (statusIds.length === 1) {
            return res.status(200).json({
                count: counts[statusIds[0]] || 0,
            });
        }

        return res.status(200).json({
            counts,
        });
    } catch (e) {
        console.error(e);

        return res.status(500).json({
            error: "Server error",
        });
    }
};

const createProgram = async (req, res) => {
    try {
        const { data: currentUserDetails, error: currentUserError } =
            await getCurrentUserDetails(req);

        if (currentUserError) {
            return res
                .status(currentUserError.status || 401)
                .json({ error: currentUserError.message });
        }

        const id_structure = currentUserDetails.id_structure;

        const {
            id_param_structure,
            description,
            date_start,
            date_end,
            id_status,
        } = req.body;

        if (
            !id_param_structure ||
            !description ||
            !date_start ||
            !date_end ||
            !id_status
        ) {
            return res.status(400).json({
                error: "Missing required fields",
            });
        }

        const { data, error } = await supabaseAdmin
            .from("programs")
            .insert({
                id_structure,
                id_param_structure,
                description,
                date_start,
                date_end,
                id_status,
            })
            .select("*")
            .single();

        if (error) {
            return res.status(400).json({
                error: error.message,
            });
        }

        return res.status(201).json(data);
    } catch (e) {
        console.error(e);

        return res.status(500).json({
            error: "Server error",
        });
    }
};

const updateProgram = async (req, res) => {
    try {
        const { data: currentUserDetails, error: currentUserError } =
            await getCurrentUserDetails(req);

        if (currentUserError) {
            return res
                .status(currentUserError.status || 401)
                .json({ error: currentUserError.message });
        }

        const id_structure = currentUserDetails.id_structure;

        const {
            id_param_structure,
            description,
            date_start,
            date_end,
            id_status,
        } = req.body;

        if (
            !id_param_structure ||
            !description ||
            !date_start ||
            !date_end ||
            !id_status
        ) {
            return res.status(400).json({
                error: "Missing required fields",
            });
        }

        const { data, error } = await supabaseAdmin
            .from("programs")
            .update({
                id_param_structure,
                description,
                date_start,
                date_end,
                id_status,
            })
            .eq("id", req.params.id)
            .eq("id_structure", id_structure)
            .select("*")
            .maybeSingle();

        if (error) {
            return res.status(400).json({
                error: error.message,
            });
        }

        if (!data) {
            return res.status(404).json({
                error: "Program not found in current structure",
            });
        }

        return res.status(200).json(data);
    } catch (e) {
        console.error(e);

        return res.status(500).json({
            error: "Server error",
        });
    }
};

const getProgramProjects = async (req, res) => {
    try {
        const { id: programId } = req.params;

        if (!programId) {
            return res.status(400).json({
                error: "programId is required",
            });
        }

        const { data: currentUserDetails, error: currentUserError } =
            await getCurrentUserDetails(req);

        if (currentUserError) {
            return res
                .status(currentUserError.status || 401)
                .json({ error: currentUserError.message });
        }

        const id_structure = currentUserDetails.id_structure;

        const { data: programData, error: programError } =
            await supabaseAdmin
                .from("programs")
                .select("*")
                .eq("id", programId)
                .eq("id_structure", id_structure)
                .maybeSingle();

        if (programError) {
            return res.status(400).json({
                error: programError.message,
            });
        }

        if (!programData) {
            return res.status(404).json({
                error: "Program not found in current structure",
            });
        }

        const { data: projectsData, error: projectsError } =
            await supabaseAdmin
                .from("projects")
                .select("*")
                .eq("id_structure", id_structure);

        if (projectsError) {
            return res.status(400).json({
                error: projectsError.message,
            });
        }

        const projects = projectsData ?? [];

        const {
            data: programProjectLinksData,
            error: programProjectLinksError,
        } = await supabaseAdmin
            .schema(RELATIONAL_SCHEMA)
            .from("program_projects")
            .select("*")
            .eq("id_program", programId);

        if (programProjectLinksError) {
            return res.status(400).json({
                error: programProjectLinksError.message,
            });
        }

        const programProjectLinks =
            programProjectLinksData ?? [];

        const projectAuthUserIds = unique(
            projects.map((project) => project.id_user)
        );

        let projectUsersData = [];

        if (projectAuthUserIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .from("user_details")
                .select("*")
                .in("id_auth_user", projectAuthUserIds);

            if (error) {
                return res.status(400).json({
                    error: error.message,
                });
            }

            projectUsersData = data ?? [];
        }

        const projectUserByAuthId = new Map(
            projectUsersData.map((userDetails) => [
                String(userDetails.id_auth_user),
                userDetails,
            ])
        );

        const projectsWithUsers = projects.map((project) => {
            const userDetails = project.id_user
                ? projectUserByAuthId.get(
                    String(project.id_user)
                ) ?? null
                : null;

            return {
                ...project,
                user: userDetails,
                user_details: userDetails,
            };
        });

        const assignedProjectIds = new Set(
            programProjectLinks.map((link) =>
                String(link.id_project)
            )
        );

        const programProjects = projectsWithUsers.filter(
            (project) => {
                return assignedProjectIds.has(
                    String(project.id)
                );
            }
        );

        const availableProjects = projectsWithUsers.filter(
            (project) => {
                return !assignedProjectIds.has(
                    String(project.id)
                );
            }
        );

        return res.status(200).json({
            program: programData,
            programProjectLinks,
            programProjects,
            availableProjects,
        });
    } catch (e) {
        console.error(e);

        return res.status(500).json({
            error: e.message || "Server error",
        });
    }
};

const addProjectToProgram = async (req, res) => {
    try {
        const { id: programId } = req.params;
        const { projectIds = [] } = req.body;

        if (!programId) {
            return res.status(400).json({
                error: "programId is required",
            });
        }

        if (!Array.isArray(projectIds)) {
            return res.status(400).json({
                error: "projectIds must be an array",
            });
        }

        const uniqueProjectIds = unique(projectIds);

        if (uniqueProjectIds.length === 0) {
            return res.status(400).json({
                error: "At least one project is required",
            });
        }

        const { data: currentUserDetails, error: currentUserError } =
            await getCurrentUserDetails(req);

        if (currentUserError) {
            return res
                .status(currentUserError.status || 401)
                .json({ error: currentUserError.message });
        }

        const id_structure = currentUserDetails.id_structure;

        const { data: programData, error: programError } =
            await supabaseAdmin
                .from("programs")
                .select("id")
                .eq("id", programId)
                .eq("id_structure", id_structure)
                .maybeSingle();

        if (programError) {
            return res.status(400).json({
                error: programError.message,
            });
        }

        if (!programData) {
            return res.status(404).json({
                error: "Program not found in current structure",
            });
        }

        const {
            data: validProjectsData,
            error: validProjectsError,
        } = await supabaseAdmin
            .from("projects")
            .select("id")
            .eq("id_structure", id_structure)
            .in("id", uniqueProjectIds);

        if (validProjectsError) {
            return res.status(400).json({
                error: validProjectsError.message,
            });
        }

        const validProjects = validProjectsData ?? [];

        if (
            validProjects.length !==
            uniqueProjectIds.length
        ) {
            return res.status(400).json({
                error: "One or more projects are invalid for this structure",
            });
        }

        const {
            data: existingLinksData,
            error: existingLinksError,
        } = await supabaseAdmin
            .schema(RELATIONAL_SCHEMA)
            .from("program_projects")
            .select("id_project")
            .eq("id_program", programId)
            .in("id_project", uniqueProjectIds);

        if (existingLinksError) {
            return res.status(400).json({
                error: existingLinksError.message,
            });
        }

        const existingProjectIds = new Set(
            (existingLinksData ?? []).map((link) =>
                String(link.id_project)
            )
        );

        const missingProjectIds = uniqueProjectIds.filter(
            (projectId) => {
                return !existingProjectIds.has(
                    String(projectId)
                );
            }
        );

        let addedProgramProjects = [];

        if (missingProjectIds.length > 0) {
            const rows = missingProjectIds.map(
                (id_project) => ({
                    id_program: programId,
                    id_project,
                })
            );

            const { data, error } = await supabaseAdmin
                .schema(RELATIONAL_SCHEMA)
                .from("program_projects")
                .insert(rows)
                .select("*");

            if (error) {
                return res.status(400).json({
                    error: error.message,
                });
            }

            addedProgramProjects = data ?? [];
        }

        return res.status(201).json({
            addedProgramProjects,

            alreadyAssignedProjectIds:
                uniqueProjectIds.filter((projectId) => {
                    return existingProjectIds.has(
                        String(projectId)
                    );
                }),
        });
    } catch (e) {
        console.error(e);

        return res.status(500).json({
            error: e.message || "Server error",
        });
    }
};

module.exports = {
    getPrograms,
    getProgramsStatusCounts,
    getProgramProjects,
    addProjectToProgram,
    createProgram,
    updateProgram,
};