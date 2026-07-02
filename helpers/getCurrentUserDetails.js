const { supabaseAdmin } = require("../db/supabase");

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

module.exports = {
    getCurrentUserDetails,
};