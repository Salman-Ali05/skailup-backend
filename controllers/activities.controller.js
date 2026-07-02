const { supabaseAdmin } = require("../db/supabase");

const OPTIONS_SCHEMA = "options_set";
const RELATIONAL_SCHEMA = "relational";

const { getCurrentUserDetails } = require("../helpers/getCurrentUserDetails");

const unique = (arr) => [...new Set(arr.filter(Boolean))];

const getActivities = async (req, res) => {
    try {
        const { programId } = req.params;

        if (!programId) {
            return res.status(400).json({ error: "programId is required" });
        }

        const { data: currentUserDetails, error: currentUserError } =
            await getCurrentUserDetails(req);

        if (currentUserError) {
            return res
                .status(currentUserError.status || 401)
                .json({ error: currentUserError.message });
        }

        const id_structure = currentUserDetails.id_structure;

        const { data: programData, error: programError } = await supabaseAdmin
            .from("programs")
            .select("*")
            .eq("id", programId)
            .eq("id_structure", id_structure)
            .maybeSingle();

        if (programError) {
            return res.status(400).json({ error: programError.message });
        }

        if (!programData) {
            return res.status(404).json({ error: "Program not found" });
        }

        /**
         * Nouvelle base :
         * relational.program_activities
         */
        const { data: programActivitiesData, error: programActivitiesError } =
            await supabaseAdmin
                .schema(RELATIONAL_SCHEMA)
                .from("program_activities")
                .select("*")
                .eq("id_program", programId);

        if (programActivitiesError) {
            return res.status(400).json({ error: programActivitiesError.message });
        }

        const programActivities = programActivitiesData ?? [];
        const activityIds = unique(
            programActivities.map((link) => link.id_activity)
        );

        let activitiesList = [];

        if (activityIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .from("activities")
                .select("*")
                .in("id", activityIds)
                .eq("id_structure", id_structure)
                .order("created_at", { ascending: false });

            if (error) {
                return res.status(400).json({ error: error.message });
            }

            activitiesList = data ?? [];
        }

        const validActivityIds = unique(
            activitiesList.map((activity) => activity.id)
        );

        let activityProjectsData = [];
        let activityContribsData = [];
        let activityHourlyRatesData = [];

        if (validActivityIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .schema(RELATIONAL_SCHEMA)
                .from("activity_projects")
                .select("*")
                .in("id_activity", validActivityIds);

            if (error) {
                return res.status(400).json({ error: error.message });
            }

            activityProjectsData = data ?? [];
        }

        if (validActivityIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .schema(RELATIONAL_SCHEMA)
                .from("activity_contribs")
                .select("*")
                .in("id_activity", validActivityIds);

            if (error) {
                return res.status(400).json({ error: error.message });
            }

            activityContribsData = data ?? [];
        }

        if (validActivityIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .schema(RELATIONAL_SCHEMA)
                .from("activity_hourly_rates")
                .select("*")
                .in("id_activity", validActivityIds);

            if (error) {
                return res.status(400).json({ error: error.message });
            }

            activityHourlyRatesData = data ?? [];
        }

        const projectIds = unique(
            activityProjectsData.map((link) => link.id_project)
        );

        const contributorIds = unique(
            activityContribsData.map((link) => link.id_contrib)
        );

        const hourlyRateIds = unique(
            activityHourlyRatesData.map((link) => link.id_hourly_rate)
        );

        let projects = [];
        let contributors = [];
        let hourlyRates = [];

        if (projectIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .from("projects")
                .select("*")
                .in("id", projectIds)
                .eq("id_structure", id_structure);

            if (error) {
                return res.status(400).json({ error: error.message });
            }

            projects = data ?? [];
        }

        if (contributorIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .from("contributors")
                .select("*, contributor_details:id_contributor_details (*)")
                .in("id", contributorIds)
                .eq("id_structure", id_structure);

            if (error) {
                return res.status(400).json({ error: error.message });
            }

            contributors = data ?? [];
        }

        if (hourlyRateIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .from("hourly_rates")
                .select("*")
                .in("id", hourlyRateIds)
                .eq("id_structure", id_structure);

            if (error) {
                return res.status(400).json({ error: error.message });
            }

            hourlyRates = data ?? [];
        }

        const contributorAuthUserIds = unique(
            contributors.map((contributor) => contributor.id_user)
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

        const contributorsWithDetails = contributors.map((contributor) => {
            const userDetails = contributorUserDetailsData.find((details) => {
                return details.id_auth_user === contributor.id_user;
            });

            return {
                ...contributor,
                user_details: userDetails ?? null,
            };
        });

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

        const { data: tagParamTypesData, error: tagParamTypesError } =
            await supabaseAdmin
                .schema(OPTIONS_SCHEMA)
                .from("os_tag_params")
                .select("*");

        if (tagParamTypesError) {
            return res.status(400).json({ error: tagParamTypesError.message });
        }

        const tagParamTypes = tagParamTypesData ?? [];

        const { data: tagParamStructuresData, error: tagParamStructuresError } =
            await supabaseAdmin
                .from("tag_param_structure")
                .select("*")
                .eq("id_structure", id_structure);

        if (tagParamStructuresError) {
            return res.status(400).json({ error: tagParamStructuresError.message });
        }

        const tagParamStructures = tagParamStructuresData ?? [];

        const activityTypeParam = tagParamTypes.find((item) => {
            return item.code === "Activities" || item.lang_fr === "Activités";
        });

        const activityParamNames = activityTypeParam?.id
            ? tagParamStructures.filter((item) => {
                return String(item.id_type_param) === String(activityTypeParam.id);
            })
            : tagParamStructures;

        const statusById = new Map(
            statusOptions.map((status) => [String(status.id), status])
        );

        const tagParamStructureById = new Map(
            tagParamStructures.map((tag) => [String(tag.id), tag])
        );

        const projectById = new Map(
            projects.map((project) => [String(project.id), project])
        );

        const contributorById = new Map(
            contributorsWithDetails.map((contributor) => [
                String(contributor.id),
                contributor,
            ])
        );

        const hourlyRateById = new Map(
            hourlyRates.map((rate) => [String(rate.id), rate])
        );

        const activityProjects = activityProjectsData.map((link) => {
            const project = projectById.get(String(link.id_project)) ?? null;

            return {
                ...link,
                project,
                projects: project,
            };
        });

        const activityContribs = activityContribsData.map((link) => {
            const contributor = contributorById.get(String(link.id_contrib)) ?? null;

            return {
                ...link,
                contributor,
                contributors: contributor,
            };
        });

        const activityHourlyRates = activityHourlyRatesData.map((link) => {
            const hourlyRate = hourlyRateById.get(String(link.id_hourly_rate)) ?? null;

            return {
                ...link,
                hourly_rate: hourlyRate,
                hourly_rates: hourlyRate,
            };
        });

        const activities = activitiesList.map((activity) => {
            const activityId = String(activity.id);
            const statusId = String(activity.id_status || "");
            const paramNameId = String(activity.id_param_name || "");

            const relatedProgramActivities = programActivities.filter((link) => {
                return String(link.id_activity) === activityId;
            });

            const relatedProjects = activityProjects.filter((link) => {
                return String(link.id_activity) === activityId;
            });

            const relatedContribs = activityContribs.filter((link) => {
                return String(link.id_activity) === activityId;
            });

            const relatedHourlyRates = activityHourlyRates.filter((link) => {
                return String(link.id_activity) === activityId;
            });

            return {
                ...activity,

                structure: structureData ?? null,
                program: programData ?? null,

                status: statusById.get(statusId) ?? null,
                param_name: tagParamStructureById.get(paramNameId) ?? null,

                program_activities: relatedProgramActivities,
                activity_projects: relatedProjects,
                activity_contribs: relatedContribs,
                activity_hourly_rates: relatedHourlyRates,

                projects: relatedProjects
                    .map((link) => link.project)
                    .filter(Boolean),

                contributors: relatedContribs
                    .map((link) => link.contributor)
                    .filter(Boolean),

                hourly_rates: relatedHourlyRates
                    .map((link) => link.hourly_rate)
                    .filter(Boolean),
            };
        });

        return res.status(200).json({
            program: programData,
            structure: structureData,

            activities,

            programActivities,
            activityProjects,
            activityContribs,
            activityHourlyRates,

            projects,
            contributors: contributorsWithDetails,
            hourlyRates,

            statusOptions,
            tagParamStructures,
            activityParamNames,
            tagParamTypes,
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Server error" });
    }
};

const createActivity = async (req, res) => {
    let createdActivity = null;
    let createdHourlyRateIds = [];

    try {
        const { programId } = req.params;

        if (!programId) {
            return res.status(400).json({ error: "programId is required" });
        }

        const { data: currentUserDetails, error: currentUserError } =
            await getCurrentUserDetails(req);

        if (currentUserError) {
            return res
                .status(currentUserError.status || 401)
                .json({ error: currentUserError.message });
        }

        const id_structure = currentUserDetails.id_structure;

        const {
            id_debriefing,
            description,
            duration_in_minutes,
            duration_realized,
            incremental_session,
            is_finished,
            is_note_needed,
            is_planable,
            is_priced,
            is_sign_needed,
            name,
            number_session,
            id_param_name,
            rate_60minutes,
            id_status,

            projects = [],
            contribs = [],
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: "name is required" });
        }

        if (!id_param_name) {
            return res.status(400).json({ error: "id_param_name is required" });
        }

        if (!id_status) {
            return res.status(400).json({ error: "id_status is required" });
        }

        if (!Array.isArray(projects)) {
            return res.status(400).json({ error: "projects must be an array" });
        }

        if (!Array.isArray(contribs)) {
            return res.status(400).json({ error: "contribs must be an array" });
        }

        if (contribs.length > 0 && !Array.isArray(rate_60minutes)) {
            return res.status(400).json({
                error: "rate_60minutes must be an array when contribs are provided",
            });
        }

        if (contribs.length > 0 && rate_60minutes.length !== contribs.length) {
            return res.status(400).json({
                error: "rate_60minutes must have the same length as contribs",
            });
        }

        const uniqueProjects = unique(projects);
        const uniqueContribs = unique(contribs);

        if (uniqueContribs.length !== contribs.length) {
            return res.status(400).json({
                error: "contribs must not contain duplicates",
            });
        }

        const { data: programData, error: programError } = await supabaseAdmin
            .from("programs")
            .select("*")
            .eq("id", programId)
            .eq("id_structure", id_structure)
            .maybeSingle();

        if (programError) {
            return res.status(400).json({ error: programError.message });
        }

        if (!programData) {
            return res.status(404).json({ error: "Program not found" });
        }

        if (uniqueProjects.length > 0) {
            const { data: validProjects, error: projectsError } = await supabaseAdmin
                .from("projects")
                .select("id")
                .eq("id_structure", id_structure)
                .in("id", uniqueProjects);

            if (projectsError) {
                return res.status(400).json({ error: projectsError.message });
            }

            if ((validProjects ?? []).length !== uniqueProjects.length) {
                return res.status(400).json({
                    error: "One or more projects are invalid for this structure",
                });
            }
        }

        if (uniqueContribs.length > 0) {
            const { data: validContribs, error: contribsError } = await supabaseAdmin
                .from("contributors")
                .select("id")
                .eq("id_structure", id_structure)
                .in("id", uniqueContribs);

            if (contribsError) {
                return res.status(400).json({ error: contribsError.message });
            }

            if ((validContribs ?? []).length !== uniqueContribs.length) {
                return res.status(400).json({
                    error: "One or more contributors are invalid for this structure",
                });
            }
        }

        const activityPayload = {
            id_debriefing: id_debriefing || null,
            description: description || null,
            duration_in_minutes: duration_in_minutes ?? null,
            duration_realized: duration_realized ?? null,
            incremental_session: incremental_session ?? null,
            is_finished: is_finished ?? false,
            is_note_needed: is_note_needed ?? false,
            is_planable: is_planable ?? false,
            is_priced: is_priced ?? false,
            is_sign_needed: is_sign_needed ?? false,
            name,
            number_session: number_session ?? null,
            id_param_name,
            id_program: programId,
            rate_60minutes: null,
            id_status,
            id_structure,
        };

        const { data: activityData, error: activityError } = await supabaseAdmin
            .from("activities")
            .insert(activityPayload)
            .select("*")
            .single();

        if (activityError) {
            return res.status(400).json({ error: activityError.message });
        }

        createdActivity = activityData;

        const id_activity = createdActivity.id;

        let programActivity = null;
        let activityProjects = [];
        let activityContribs = [];
        let hourlyRates = [];
        let activityHourlyRates = [];

        /**
         * Nouvelle relation obligatoire :
         * program -> activity
         */
        const { data: programActivityData, error: programActivityError } =
            await supabaseAdmin
                .schema(RELATIONAL_SCHEMA)
                .from("program_activities")
                .insert({
                    id_program: programId,
                    id_activity,
                })
                .select("*")
                .single();

        if (programActivityError) {
            throw programActivityError;
        }

        programActivity = programActivityData;

        if (uniqueProjects.length > 0) {
            const projectRows = uniqueProjects.map((id_project) => ({
                id_activity,
                id_project,
            }));

            const { data, error } = await supabaseAdmin
                .schema(RELATIONAL_SCHEMA)
                .from("activity_projects")
                .insert(projectRows)
                .select("*");

            if (error) {
                throw error;
            }

            activityProjects = data ?? [];
        }

        if (uniqueContribs.length > 0) {
            const contribRows = uniqueContribs.map((id_contrib) => ({
                id_activity,
                id_contrib,
            }));

            const { data, error } = await supabaseAdmin
                .schema(RELATIONAL_SCHEMA)
                .from("activity_contribs")
                .insert(contribRows)
                .select("*");

            if (error) {
                throw error;
            }

            activityContribs = data ?? [];
        }

        if (uniqueContribs.length > 0) {
            const hourlyRateRows = uniqueContribs.map((id_contrib, index) => ({
                id_contrib,
                id_structure,
                rate_60minutes: Number(rate_60minutes[index]) || 0,
            }));

            const { data, error } = await supabaseAdmin
                .from("hourly_rates")
                .insert(hourlyRateRows)
                .select("*");

            if (error) {
                throw error;
            }

            hourlyRates = data ?? [];
            createdHourlyRateIds = hourlyRates.map((rate) => rate.id);

            const activityHourlyRateRows = hourlyRates.map((hourlyRate) => ({
                id_activity,
                id_hourly_rate: hourlyRate.id,
            }));

            if (activityHourlyRateRows.length > 0) {
                const { data: relationData, error: relationError } =
                    await supabaseAdmin
                        .schema(RELATIONAL_SCHEMA)
                        .from("activity_hourly_rates")
                        .insert(activityHourlyRateRows)
                        .select("*");

                if (relationError) {
                    throw relationError;
                }

                activityHourlyRates = relationData ?? [];
            }
        }

        return res.status(201).json({
            activity: createdActivity,
            programActivity,
            activityProjects,
            activityContribs,
            hourlyRates,
            activityHourlyRates,
        });
    } catch (e) {
        console.error(e);

        if (createdActivity?.id) {
            await supabaseAdmin
                .schema(RELATIONAL_SCHEMA)
                .from("activity_hourly_rates")
                .delete()
                .eq("id_activity", createdActivity.id);

            await supabaseAdmin
                .schema(RELATIONAL_SCHEMA)
                .from("activity_contribs")
                .delete()
                .eq("id_activity", createdActivity.id);

            await supabaseAdmin
                .schema(RELATIONAL_SCHEMA)
                .from("activity_projects")
                .delete()
                .eq("id_activity", createdActivity.id);

            await supabaseAdmin
                .schema(RELATIONAL_SCHEMA)
                .from("program_activities")
                .delete()
                .eq("id_activity", createdActivity.id);

            await supabaseAdmin
                .from("activities")
                .delete()
                .eq("id", createdActivity.id);
        }

        if (createdHourlyRateIds.length > 0) {
            await supabaseAdmin
                .from("hourly_rates")
                .delete()
                .in("id", createdHourlyRateIds);
        }

        return res.status(500).json({
            error: e.message || "Server error",
        });
    }
};

module.exports = {
    getActivities,
    createActivity,
};