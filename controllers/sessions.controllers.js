const { supabaseAdmin } = require("../db/supabase");
const { getCurrentUserDetails } = require("../helpers/getCurrentUserDetails");

const RELATIONAL_SCHEMA = "relational";

const unique = (values = []) => {
    return [
        ...new Set(
            values
                .filter(Boolean)
                .map(String)
        ),
    ];
};

const getActivityUserIds = async ({
    idActivity,
    idStructure,
}) => {
    const {
        data: activityContribLinks,
        error: activityContribLinksError,
    } = await supabaseAdmin
        .schema(RELATIONAL_SCHEMA)
        .from("activity_contribs")
        .select("id_contrib")
        .eq("id_activity", idActivity);

    if (activityContribLinksError) {
        throw activityContribLinksError;
    }

    const contributorIds = unique(
        (activityContribLinks ?? []).map(
            (link) => link.id_contrib
        )
    );

    let contributorUserIds = [];

    if (contributorIds.length > 0) {
        const {
            data: contributors,
            error: contributorsError,
        } = await supabaseAdmin
            .from("contributors")
            .select("id, id_user")
            .eq("id_structure", idStructure)
            .in("id", contributorIds);

        if (contributorsError) {
            throw contributorsError;
        }

        contributorUserIds = unique(
            (contributors ?? []).map(
                (contributor) => contributor.id_user
            )
        );
    }

    const {
        data: activityProjectLinks,
        error: activityProjectLinksError,
    } = await supabaseAdmin
        .schema(RELATIONAL_SCHEMA)
        .from("activity_projects")
        .select("id_project")
        .eq("id_activity", idActivity);

    if (activityProjectLinksError) {
        throw activityProjectLinksError;
    }

    const projectIds = unique(
        (activityProjectLinks ?? []).map(
            (link) => link.id_project
        )
    );

    let projectUserIds = [];

    if (projectIds.length > 0) {
        const {
            data: projectUsers,
            error: projectUsersError,
        } = await supabaseAdmin
            .schema(RELATIONAL_SCHEMA)
            .from("project_users")
            .select("id_project, id_user")
            .in("id_project", projectIds);

        if (projectUsersError) {
            throw projectUsersError;
        }

        projectUserIds = unique(
            (projectUsers ?? []).map(
                (projectUser) => projectUser.id_user
            )
        );
    }

    return unique([
        ...contributorUserIds,
        ...projectUserIds,
    ]);
};

const createSessionsForActivity = async ({
    idActivity,
    idProgram,
    idStructure,
    numberSession,
    idTypeSession = null,
    startIncrement = 1,
}) => {
    const parsedNumberSession = Number(numberSession);
    const parsedStartIncrement = Number(startIncrement);

    if (!idActivity) {
        throw new Error("idActivity is required");
    }

    if (!idProgram) {
        throw new Error("idProgram is required");
    }

    if (!idStructure) {
        throw new Error("idStructure is required");
    }

    if (
        !Number.isInteger(parsedNumberSession) ||
        parsedNumberSession <= 0
    ) {
        throw new Error(
            "numberSession must be a positive integer"
        );
    }

    if (
        !Number.isInteger(parsedStartIncrement) ||
        parsedStartIncrement <= 0
    ) {
        throw new Error(
            "startIncrement must be a positive integer"
        );
    }

    /*
     * Récupération automatique :
     * - des utilisateurs des intervenants ;
     * - des membres des projets.
     */
    const activityUserIds =
        await getActivityUserIds({
            idActivity,
            idStructure,
        });

    /*
     * Création des sessions.
     *
     * id_session_status est volontairement absent :
     * Supabase applique le statut "En attente"
     * défini par défaut dans la base.
     */
    const sessionRows = Array.from(
        {
            length: parsedNumberSession,
        },
        (_, index) => ({
            id_activity: idActivity,
            id_program: idProgram,
            id_structure: idStructure,

            id_type_session:
                idTypeSession || null,

            incremental_session:
                parsedStartIncrement + index,
        })
    );

    const {
        data: createdSessions,
        error: sessionsError,
    } = await supabaseAdmin
        .from("sessions")
        .insert(sessionRows)
        .select("*");

    if (sessionsError) {
        throw sessionsError;
    }

    const sessions = createdSessions ?? [];

    const sessionIds = sessions.map(
        (session) => session.id
    );

    let sessionUsers = [];

    try {
        /*
         * Tous les utilisateurs associés à l'activité
         * sont affectés à chacune des sessions créées.
         */
        if (
            sessions.length > 0 &&
            activityUserIds.length > 0
        ) {
            const sessionUserRows =
                sessions.flatMap((session) => {
                    return activityUserIds.map(
                        (id_user) => ({
                            id_session: session.id,
                            id_user,
                        })
                    );
                });

            const {
                data: sessionUsersData,
                error: sessionUsersError,
            } = await supabaseAdmin
                .schema(RELATIONAL_SCHEMA)
                .from("session_users")
                .insert(sessionUserRows)
                .select("*");

            if (sessionUsersError) {
                throw sessionUsersError;
            }

            sessionUsers =
                sessionUsersData ?? [];
        }

        return {
            sessions,
            sessionUsers,
            activityUserIds,
        };
    } catch (error) {
        /*
         * Rollback des sessions créées
         * si session_users échoue.
         */
        if (sessionIds.length > 0) {
            await supabaseAdmin
                .schema(RELATIONAL_SCHEMA)
                .from("session_users")
                .delete()
                .in(
                    "id_session",
                    sessionIds
                );

            await supabaseAdmin
                .from("sessions")
                .delete()
                .in("id", sessionIds);
        }

        throw error;
    }
};

const getSessionsByActivity = async (req, res) => {
    try {
        const { activityId } = req.params;

        if (!activityId) {
            return res.status(400).json({
                error: "activityId is required",
            });
        }

        const {
            data: currentUserDetails,
            error: currentUserError,
        } = await getCurrentUserDetails(req);

        if (currentUserError) {
            return res
                .status(currentUserError.status || 401)
                .json({
                    error: currentUserError.message,
                });
        }

        const id_structure =
            currentUserDetails.id_structure;

        const {
            data: activity,
            error: activityError,
        } = await supabaseAdmin
            .from("activities")
            .select("id")
            .eq("id", activityId)
            .eq("id_structure", id_structure)
            .maybeSingle();

        if (activityError) {
            return res.status(400).json({
                error: activityError.message,
            });
        }

        if (!activity) {
            return res.status(404).json({
                error: "Activity not found",
            });
        }

        const {
            data: sessions,
            error: sessionsError,
        } = await supabaseAdmin
            .from("sessions")
            .select("*")
            .eq("id_activity", activityId)
            .eq("id_structure", id_structure)
            .order("incremental_session", {
                ascending: true,
            });

        if (sessionsError) {
            return res.status(400).json({
                error: sessionsError.message,
            });
        }

        const sessionIds = (sessions ?? []).map(
            (session) => session.id
        );

        let sessionUsers = [];

        if (sessionIds.length > 0) {
            const {
                data,
                error,
            } = await supabaseAdmin
                .schema(RELATIONAL_SCHEMA)
                .from("session_users")
                .select("*")
                .in("id_session", sessionIds);

            if (error) {
                return res.status(400).json({
                    error: error.message,
                });
            }

            sessionUsers = data ?? [];
        }

        return res.status(200).json({
            sessions: sessions ?? [],
            sessionUsers,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error:
                error.message ||
                "Impossible de récupérer les sessions",
        });
    }
};

const createSessions = async (req, res) => {
    try {
        const { activityId } = req.params;

        const {
            numberSession,
            idTypeSession,
        } = req.body;

        if (!activityId) {
            return res.status(400).json({
                error: "activityId is required",
            });
        }

        const {
            data: currentUserDetails,
            error: currentUserError,
        } = await getCurrentUserDetails(req);

        if (currentUserError) {
            return res
                .status(
                    currentUserError.status || 401
                )
                .json({
                    error:
                        currentUserError.message,
                });
        }

        const id_structure =
            currentUserDetails.id_structure;

        /*
         * Vérification de l'activité.
         */
        const {
            data: activity,
            error: activityError,
        } = await supabaseAdmin
            .from("activities")
            .select(
                `
                id,
                id_program,
                id_structure
                `
            )
            .eq("id", activityId)
            .eq(
                "id_structure",
                id_structure
            )
            .maybeSingle();

        if (activityError) {
            return res.status(400).json({
                error: activityError.message,
            });
        }

        if (!activity) {
            return res.status(404).json({
                error: "Activity not found",
            });
        }

        /*
         * Recherche du dernier numéro de session.
         *
         * Si les sessions 1, 2 et 3 existent déjà,
         * la prochaine commencera à 4.
         */
        const {
            data: lastSession,
            error: lastSessionError,
        } = await supabaseAdmin
            .from("sessions")
            .select("incremental_session")
            .eq(
                "id_activity",
                activityId
            )
            .eq(
                "id_structure",
                id_structure
            )
            .order(
                "incremental_session",
                {
                    ascending: false,
                }
            )
            .limit(1)
            .maybeSingle();

        if (lastSessionError) {
            return res.status(400).json({
                error: lastSessionError.message,
            });
        }

        const startIncrement =
            Number(
                lastSession?.incremental_session ||
                0
            ) + 1;

        const result =
            await createSessionsForActivity({
                idActivity:
                    activity.id,

                idProgram:
                    activity.id_program,

                idStructure:
                    id_structure,

                numberSession,

                idTypeSession:
                    idTypeSession || null,

                startIncrement,
            });

        return res
            .status(201)
            .json(result);
    } catch (error) {
        console.error(
            "createSessions:",
            error
        );

        return res.status(500).json({
            error:
                error.message ||
                "Impossible de créer les sessions",
        });
    }
};

module.exports = {
    createSessionsForActivity,
    getSessionsByActivity,
    createSessions,
};