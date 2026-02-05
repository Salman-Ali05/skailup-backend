const { createClient } = require("@supabase/supabase-js");

const authenticated = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ error: "Missing authentication token" });
        }

        const supabaseUser = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            {
                global: { headers: { Authorization: `Bearer ${token}` } },
                auth: { persistSession: false, autoRefreshToken: false },
            }
        );

        const { data, error } = await supabaseUser.auth.getUser();
        if (error || !data.user) {
            return res.status(401).json({ error: "Invalid or expired token" });
        }

        req.user = data.user;
        req.supabaseUser = supabaseUser;

        next();
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Server error" });
    }
};

module.exports = { authenticated };
