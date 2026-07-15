const { supabaseAdmin } = require("../../db/supabase");

const OPTIONS_SCHEMA = "options_set";

const OPTION_SET_TABLES = [
    "os_activity_duration",
    "os_admin_mail",
    "os_alerts_template",
    "os_business_target",
    "os_calendar_view",
    "os_default_assets",
    "os_default_images",
    "os_ess",
    "os_expertise",
    "os_fb_status_reason",
    "os_file_status",
    "os_index",
    "os_legal_status",
    "os_market_localisation",
    "os_onboarding_completed",
    "os_pagination",
    "os_perma_link",
    "os_qpv",
    "os_registration",
    "os_sector",
    "os_session_status",
    "os_session_type_link",
    "os_side_menu_items",
    "os_status",
    "os_str_img",
    "os_subject_mail",
    "os_tag1_contributor",
    "os_tag1_project",
    "os_tag2_contributor",
    "os_tag3_contributor",
    "os_tag_params",
    "os_type_activity",
    "os_type_file",
    "os_type_session",
    "os_type_structure",
    "os_type_users",
];

const getAllOptionsSets = async (req, res) => {
    try {
        const results = await Promise.all(
            OPTION_SET_TABLES.map(async (tableName) => {
                const { data, error } = await supabaseAdmin
                    .schema(OPTIONS_SCHEMA)
                    .from(tableName)
                    .select("*");

                if (error) {
                    throw new Error(
                        `${tableName}: ${error.message}`
                    );
                }

                return [
                    tableName,
                    data ?? [],
                ];
            })
        );

        const optionsSets = Object.fromEntries(results);

        return res.status(200).json(optionsSets);
    } catch (error) {
        console.error("getAllOptionsSets:", error);

        return res.status(500).json({
            error:
                error.message ||
                "Impossible de récupérer les options sets",
        });
    }
};

module.exports = {
    getAllOptionsSets,
};