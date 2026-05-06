const { supabaseAdmin } = require('../db/supabase')

const RELATIONAL_SCHEMA = 'relational'
const OPTIONS_SCHEMA = 'options_set'

const unique = (arr) => [...new Set(arr.filter(Boolean))]

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

        const contributorIds = contributorsData.map((c) => c.id).filter(Boolean)

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

        const { data: tag1Links, error: tag1LinksError } = await supabaseAdmin
            .schema(RELATIONAL_SCHEMA)
            .from('contributor_os_tag1')
            .select('*')
            .in('id_contributor', contributorIds)

        if (tag1LinksError) {
            return res.status(400).json({ error: tag1LinksError.message })
        }

        const { data: tag2Links, error: tag2LinksError } = await supabaseAdmin
            .schema(RELATIONAL_SCHEMA)
            .from('contributor_os_tag2')
            .select('*')
            .in('id_contributor', contributorIds)

        if (tag2LinksError) {
            return res.status(400).json({ error: tag2LinksError.message })
        }

        const { data: tag3Links, error: tag3LinksError } = await supabaseAdmin
            .schema(RELATIONAL_SCHEMA)
            .from('contributor_os_tag3')
            .select('*')
            .in('id_contributor', contributorIds)

        if (tag3LinksError) {
            return res.status(400).json({ error: tag3LinksError.message })
        }

        const tag1Ids = unique((tag1Links ?? []).map((t) => t.id_os_tag1))
        const tag2Ids = unique((tag2Links ?? []).map((t) => t.id_os_tag2))
        const tag3Ids = unique((tag3Links ?? []).map((t) => t.id_os_tag3))

        let osTag1Data = []
        let osTag2Data = []
        let osTag3Data = []

        if (tag1Ids.length > 0) {
            const { data, error } = await supabaseAdmin
                .schema(OPTIONS_SCHEMA)
                .from('os_tag1_contributor')
                .select('*')
                .in('id', tag1Ids)

            if (error) {
                return res.status(400).json({ error: error.message })
            }

            osTag1Data = data ?? []
        }

        if (tag2Ids.length > 0) {
            const { data, error } = await supabaseAdmin
                .schema(OPTIONS_SCHEMA)
                .from('os_tag2_contributor')
                .select('*')
                .in('id', tag2Ids)

            if (error) {
                return res.status(400).json({ error: error.message })
            }

            osTag2Data = data ?? []
        }

        if (tag3Ids.length > 0) {
            const { data, error } = await supabaseAdmin
                .schema(OPTIONS_SCHEMA)
                .from('os_tag3_contributor')
                .select('*')
                .in('id', tag3Ids)

            if (error) {
                return res.status(400).json({ error: error.message })
            }

            osTag3Data = data ?? []
        }

        const contributors = contributorsData.map((contributor) => {
            const authUser = authData.users.find(
                (user) => user.id === contributor.id_user
            )

            const userDetails = userDetailsData.find(
                (details) => details.id_auth_user === contributor.id_user
            )

            const contributorTag1Links = (tag1Links ?? []).filter(
                (link) => link.id_contributor === contributor.id
            )

            const contributorTag2Links = (tag2Links ?? []).filter(
                (link) => link.id_contributor === contributor.id
            )

            const contributorTag3Links = (tag3Links ?? []).filter(
                (link) => link.id_contributor === contributor.id
            )

            const Tag1 = contributorTag1Links
                .map((link) =>
                    osTag1Data.find((tag) => tag.id === link.id_os_tag1)
                )
                .filter(Boolean)

            const Tag2 = contributorTag2Links
                .map((link) =>
                    osTag2Data.find((tag) => tag.id === link.id_os_tag2)
                )
                .filter(Boolean)

            const Tag3 = contributorTag3Links
                .map((link) =>
                    osTag3Data.find((tag) => tag.id === link.id_os_tag3)
                )
                .filter(Boolean)

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
                user_details: userDetails ?? null,
                tags: {
                    Tag1,
                    Tag2,
                    Tag3
                }
            }
        })

        return res.status(200).json(contributors)
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Server error' })
    }
}

module.exports = { getContributors }