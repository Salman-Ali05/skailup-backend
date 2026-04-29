const { supabaseAdmin } = require('../db/supabase')

const OPTIONS_SCHEMA = 'options_set'
const crypto = require('crypto')

/**
 * CREATE USER (ADMIN)
 * - crée auth.users
 * - crée user_details
 */
const createUser = async (req, res) => {
  try {
    const {
      email,
      password,

      // user_details
      auth_token,
      first_name,
      last_name,
      gender,
      has_agreed_cgu,
      is_admin_skailup,
      is_submit_finalized,
      last_connect,
      time_diff,
      os_type_user,
      photo_url,
      signature_url,
      address,
      birthday,
      linkedin,
      phone,
      town,
      zip_code,
      notes
    } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }

    if (!os_type_user) {
      return res.status(400).json({ error: 'os_type_user is required' })
    }

    const { data: osTypeData, error: osTypeError } = await supabaseAdmin
      .schema(OPTIONS_SCHEMA)
      .from('os_type_users')
      .select('*')
      .eq('id', os_type_user)
      .maybeSingle()

    if (osTypeError) {
      return res.status(400).json({ error: osTypeError.message })
    }

    if (!osTypeData) {
      return res.status(400).json({ error: 'Invalid os_type_user' })
    }

    // 1) créer le user auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })

    if (authError) {
      return res.status(400).json({ error: authError.message })
    }

    const authUserId = authData.user.id

    const { data: detailsData, error: detailsError } = await supabaseAdmin
      .from('user_details')
      .insert({
        id_auth_user: authUserId,

        auth_token: auth_token ?? null,
        first_name: first_name ?? null,
        last_name: last_name ?? null,
        gender: gender ?? null,

        has_agreed_cgu: has_agreed_cgu ?? false,
        is_admin_skailup: is_admin_skailup ?? false,
        is_submit_finalized: is_submit_finalized ?? false,

        last_connect: last_connect ?? null,
        time_diff: time_diff ?? null,

        os_type_user,

        photo_url: photo_url ?? null,
        signature_url: signature_url ?? null,

        address: address ?? null,
        birthday: birthday ?? null,
        linkedin: linkedin ?? null,
        phone: phone ?? null,
        town: town ?? null,
        zip_code: zip_code ?? null,

        notes: Array.isArray(notes) ? notes : []
      })
      .select()
      .single()

    if (detailsError) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      return res.status(400).json({ error: detailsError.message })
    }

    return res.status(201).json({
      user: authData.user,
      user_details: {
        ...detailsData,
        os_type_user: osTypeData
      }
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * GET ALL USERS (ADMIN)
 * - récupère auth.users
 * - récupère user_details
 * - récupère options_set.os_type_users
 * - merge côté Node
 */
const getAllUsers = async (req, res) => {
  try {
    const { data: detailsData, error: detailsError } = await supabaseAdmin
      .from('user_details')
      .select(`
        id,
        id_auth_user,
        first_name,
        last_name,
        is_admin_skailup,
        photo_url,
        os_type_user
      `)

    if (detailsError) {
      return res.status(400).json({ error: detailsError.message })
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.listUsers()

    if (authError) {
      return res.status(400).json({ error: authError.message })
    }

    const { data: osTypesData, error: osTypesError } = await supabaseAdmin
      .schema(OPTIONS_SCHEMA)
      .from('os_type_users')
      .select('*')

    if (osTypesError) {
      return res.status(400).json({ error: osTypesError.message })
    }

    const users = detailsData.map(details => {
      const authUser = authData.users.find(
        user => user.id === details.id_auth_user
      )

      const osType = osTypesData.find(
        type => type.id === details.os_type_user
      )

      return {
        id: details.id_auth_user,
        email: authUser?.email ?? null,
        details: {
          ...details,
          os_type_user: osType ?? null
        }
      }
    })

    return res.status(200).json({ users })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * UPDATE SELF USER
 * - update uniquement le user connecté
 */
const updateSelfUser = async (req, res) => {
  try {
    const userId = req.user.id

    const {
      first_name,
      last_name,
      gender,
      phone,
      birthday,
      town,
      zip_code,
      address,
      linkedin
    } = req.body

    const patch = {}

    if (typeof first_name !== 'undefined') patch.first_name = first_name
    if (typeof last_name !== 'undefined') patch.last_name = last_name
    if (typeof gender !== 'undefined') patch.gender = gender
    if (typeof phone !== 'undefined') patch.phone = phone
    if (typeof birthday !== 'undefined') patch.birthday = birthday
    if (typeof town !== 'undefined') patch.town = town
    if (typeof zip_code !== 'undefined') patch.zip_code = zip_code
    if (typeof address !== 'undefined') patch.address = address
    if (typeof linkedin !== 'undefined') patch.linkedin = linkedin

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    const { data: detailsData, error: detailsError } = await req.supabaseUser
      .from('user_details')
      .update(patch)
      .eq('id_auth_user', userId)
      .select('*')
      .maybeSingle()

    if (detailsError) {
      return res.status(400).json({ error: detailsError.message })
    }

    if (!detailsData) {
      return res.status(404).json({ error: 'user_details not found' })
    }

    let osTypeData = null

    if (detailsData.os_type_user) {
      const { data: osData, error: osError } = await req.supabaseUser
        .schema(OPTIONS_SCHEMA)
        .from('os_type_users')
        .select('*')
        .eq('id', detailsData.os_type_user)
        .maybeSingle()

      if (osError) {
        return res.status(400).json({ error: osError.message })
      }

      osTypeData = osData
    }

    return res.status(200).json({
      user_details: {
        ...detailsData,
        os_type_user: osTypeData
      }
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * GET SELF USER
 * - récupère le user connecté
 */
const getSelfUser = async (req, res) => {
  try {
    const userId = req.user.id

    const { data: detailsData, error: detailsError } = await req.supabaseUser
      .from('user_details')
      .select('*')
      .eq('id_auth_user', userId)
      .maybeSingle()

    if (detailsError) {
      return res.status(400).json({ error: detailsError.message })
    }

    if (!detailsData) {
      return res.status(404).json({ error: 'user_details not found' })
    }

    let osTypeData = null

    if (detailsData.os_type_user) {
      const { data: osData, error: osError } = await req.supabaseUser
        .schema(OPTIONS_SCHEMA)
        .from('os_type_users')
        .select('*')
        .eq('id', detailsData.os_type_user)
        .maybeSingle()

      if (osError) {
        return res.status(400).json({ error: osError.message })
      }

      osTypeData = osData
    }

    return res.status(200).json({
      user_details: {
        ...detailsData,
        os_type_user: osTypeData
      }
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const inviteContributor = async (req, res) => {
  const created = {
    authUserId: null,
    userDetailsId: null,
    contributorId: null,
    contributorDetailsId: null
  }

  try {
    const currentAuthUserId = req.user.id

    const {
      email,
      password,

      // user_details
      first_name,
      last_name,
      gender,
      phone,
      birthday,
      town,
      zip_code,
      address,
      linkedin,

      // contributor
      contrib_name,
      logo,

      // contributor_details
      code_ape,
      description,
      excellence,
      facebook,
      immatriculation_date,
      instagram,
      is_cooperative,
      is_esus,
      is_former_organisation,
      is_qualiopi,
      sales,
      twitter,
      website,
      OS_type_structure
    } = req.body

    if (!email) {
      return res.status(400).json({ error: 'email is required' })
    }

    // 1) récupérer la structure du user connecté
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

    // 2) récupérer OS_type_user = Contributor
    const { data: contributorType, error: contributorTypeError } = await supabaseAdmin
      .schema(OPTIONS_SCHEMA)
      .from('os_type_users')
      .select('id, code, lang_fr')
      .eq('code', 'Contributor')
      .maybeSingle()

    if (contributorTypeError) {
      return res.status(400).json({ error: contributorTypeError.message })
    }

    if (!contributorType) {
      return res.status(400).json({ error: 'OS type Contributor not found' })
    }

    // 3) récupérer onboarding "Incomplete" si dispo
    const { data: onboardingIncomplete, error: onboardingError } = await supabaseAdmin
      .schema(OPTIONS_SCHEMA)
      .from('os_onboarding_completed')
      .select('id, code, lang_fr')
      .eq('code', 'Incomplete')
      .maybeSingle()

    if (onboardingError) {
      return res.status(400).json({ error: onboardingError.message })
    }

    // 4) créer auth user
    const tempPassword = password || crypto.randomBytes(16).toString('base64url')

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true
      })

    if (authError) {
      return res.status(400).json({ error: authError.message })
    }

    const authUserId = authData.user.id
    created.authUserId = authUserId

    // 5) créer user_details
    // IMPORTANT : id_contributor reste null pour l'instant, car le contributor n'existe pas encore
    const { data: userDetailsData, error: userDetailsError } = await supabaseAdmin
      .from('user_details')
      .insert({
        id_auth_user: authUserId,
        first_name: first_name ?? null,
        last_name: last_name ?? null,
        gender: gender ?? null,
        phone: phone ?? null,
        birthday: birthday ?? null,
        town: town ?? null,
        zip_code: zip_code ?? null,
        address: address ?? null,
        linkedin: linkedin ?? null,
        os_type_user: contributorType.id,
        id_structure,
        id_contributor: null
      })
      .select()
      .single()

    if (userDetailsError) {
      await rollbackInvite(created)
      return res.status(400).json({ error: userDetailsError.message })
    }

    created.userDetailsId = userDetailsData.id

    // 6) créer contributor
    const contributorName =
      contrib_name ||
      [first_name, last_name].filter(Boolean).join(' ') ||
      email

    const { data: contributorData, error: contributorError } = await supabaseAdmin
      .from('contributors')
      .insert({
        email,
        logo: logo ?? null,
        name: contributorName,
        id_structure,

        id_user: authUserId,

        Onboarding_completed: onboardingIncomplete?.id ?? null,
        Tag1: null,
        Tag2: null,
        Tag3: null,
        id_contributor_details: null
      })
      .select()
      .single()

    if (contributorError) {
      await rollbackInvite(created)
      return res.status(400).json({ error: contributorError.message })
    }

    created.contributorId = contributorData.id

    // 7) relier user_details -> contributor
    const { data: updatedUserDetails, error: updateUserDetailsError } =
      await supabaseAdmin
        .from('user_details')
        .update({
          id_contributor: contributorData.id
        })
        .eq('id', userDetailsData.id)
        .select()
        .single()

    if (updateUserDetailsError) {
      await rollbackInvite(created)
      return res.status(400).json({ error: updateUserDetailsError.message })
    }

    // 8) créer contributor_details
    const { data: contributorDetailsData, error: contributorDetailsError } =
      await supabaseAdmin
        .from('contributor_details')
        .insert({
          id_contributor: contributorData.id,
          id_structure,

          address: address ?? null,
          code_ape: code_ape ?? null,
          description: description ?? null,
          excellence: excellence ?? null,
          facebook: facebook ?? null,
          immatriculation_date: immatriculation_date ?? null,
          instagram: instagram ?? null,

          is_cooperative: is_cooperative ?? false,
          is_esus: is_esus ?? false,
          is_former_organisation: is_former_organisation ?? false,
          is_qualiopi: is_qualiopi ?? false,

          linkedin: linkedin ?? null,
          sales: sales ?? null,
          town: town ?? null,
          twitter: twitter ?? null,
          website: website ?? null,
          zip_code: zip_code ?? null,

          OS_type_structure: OS_type_structure ?? null
        })
        .select()
        .single()

    if (contributorDetailsError) {
      await rollbackInvite(created)
      return res.status(400).json({ error: contributorDetailsError.message })
    }

    created.contributorDetailsId = contributorDetailsData.id

    // 9) relier contributor -> contributor_details
    const { data: updatedContributor, error: updateContributorError } =
      await supabaseAdmin
        .from('contributors')
        .update({
          id_contributor_details: contributorDetailsData.id
        })
        .eq('id', contributorData.id)
        .select()
        .single()

    if (updateContributorError) {
      await rollbackInvite(created)
      return res.status(400).json({ error: updateContributorError.message })
    }

    return res.status(201).json({
      message: 'Contributor invited successfully',
      user: authData.user,
      user_details: updatedUserDetails,
      contributor: updatedContributor,
      contributor_details: contributorDetailsData,
      temporary_password_generated: !password
    })
  } catch (e) {
    console.error(e)
    await rollbackInvite(created)
    return res.status(500).json({ error: 'Server error' })
  }
}

// In case the contrib creation had a problem, we delete what was already created
const rollbackInvite = async (created) => {
  try {
    // casser les liens FK avant delete
    if (created.contributorId) {
      await supabaseAdmin
        .from('contributors')
        .update({ id_contributor_details: null })
        .eq('id', created.contributorId)
    }

    if (created.userDetailsId) {
      await supabaseAdmin
        .from('user_details')
        .update({ id_contributor: null })
        .eq('id', created.userDetailsId)
    }

    if (created.contributorDetailsId) {
      await supabaseAdmin
        .from('contributor_details')
        .delete()
        .eq('id', created.contributorDetailsId)
    }

    if (created.contributorId) {
      await supabaseAdmin
        .from('contributors')
        .delete()
        .eq('id', created.contributorId)
    }

    if (created.userDetailsId) {
      await supabaseAdmin
        .from('user_details')
        .delete()
        .eq('id', created.userDetailsId)
    }

    if (created.authUserId) {
      await supabaseAdmin.auth.admin.deleteUser(created.authUserId)
    }
  } catch (e) {
    console.error('Rollback invite failed:', e)
  }
}

module.exports = {
  createUser,
  getAllUsers,
  getSelfUser,
  updateSelfUser,
  inviteContributor
}