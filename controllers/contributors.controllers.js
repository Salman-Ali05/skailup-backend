const { supabaseAdmin } = require('../db/supabase')

const getContributors = async (req, res) => {
    try {
        const currentAuthUserId = req.user.id

        const { data: currentUserDetails, error: currentUserError } = await supabaseAdmin
            .from('user_details')
            .select('id, id_structure')
            .eq('id_auth_user', currentAuthUserId)
            .maybeSingle()

        if (currentUserError) {
            return res.status(400).json({ error: currentUserError.message })
        }

        if (!currentUserDetails?.id_structure) {
            return res.status(400).json({ error: 'Current user has no structure' })
        }

        const id_structure = currentUserDetails.id_structure

        const { data: contributorsData, error: contributorsError } = await supabaseAdmin
            .from('contributors')
            .select(`*,contributor_details:id_contributor_details (*)`)
            .eq('id_structure', id_structure)

        if (contributorsError) {
            return res.status(400).json({ error: contributorsError.message })
        }

        if (!contributorsData || contributorsData.length === 0) {
            return res.status(200).json([])
        }

        const contributorAuthUserIds = contributorsData
            .map((contributor) => contributor.id_user)
            .filter(Boolean)

        let userDetailsData = []

        if (contributorAuthUserIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .from('user_details')
                .select('*')
                .in('id_auth_user', contributorAuthUserIds)

            if (error) {
                return res.status(400).json({ error: error.message })
            }

            userDetailsData = data ?? []
        }

        const { data: authData, error: authError } =
            await supabaseAdmin.auth.admin.listUsers()

        if (authError) {
            return res.status(400).json({ error: authError.message })
        }

        const contributors = contributorsData.map((contributor) => {
            const authUser = authData.users.find(
                (user) => user.id === contributor.id_user
            )

            const userDetails = userDetailsData.find(
                (details) => details.id_auth_user === contributor.id_user
            )

            return {
                ...contributor,
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

        return res.status(200).json(contributors)
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Server error' })
    }
}

module.exports = { getContributors }