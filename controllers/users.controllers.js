const { supabaseAdmin } = require('../db/supabase')

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
      os_type_user, // OBLIGATOIRE
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

    // 1️⃣ créer le user auth (ADMIN)
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

    // 2️⃣ créer user_details (ADMIN → bypass RLS)
    const { data: detailsData, error: detailsError } = await supabaseAdmin
      .from('user_details')
      .insert({
        auth_user_id: authUserId,

        auth_token: auth_token ?? null,
        first_name: first_name ?? null,
        last_name: last_name ?? null,
        gender: gender ?? null,

        has_agreed_cgu: has_agreed_cgu ?? false,
        is_admin_skailup: is_admin_skailup ?? false,
        is_submit_finalized: is_submit_finalized ?? false,

        last_connect: last_connect ?? null,
        time_diff: time_diff ?? null,

        os_type_user, // FK obligatoire

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
      // rollback propre
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      return res.status(400).json({ error: detailsError.message })
    }

    return res.status(201).json({
      user: authData.user,
      user_details: detailsData
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * GET ALL USERS (ADMIN)
 * - joint auth.users + user_details
 */
const getAllUsers = async (req, res) => {
  try {
    // 1️⃣ récupérer user_details
    const { data: detailsData, error: detailsError } = await supabaseAdmin
      .from('user_details', 'os_type_users')
      .select('auth_user_id, first_name, last_name, is_admin_skailup, photo_url, os_type_users(lang_fr)')

    if (detailsError) {
      return res.status(400).json({ error: detailsError.message })
    }

    // 2️⃣ récupérer auth.users
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.listUsers()

    if (authError) {
      return res.status(400).json({ error: authError.message })
    }

    // 3️⃣ merge
    const users = detailsData.map(details => {
      const authUser = authData.users.find(
        user => user.id === details.auth_user_id
      )

      return {
        id: details.auth_user_id,
        email: authUser?.email ?? null,
        details
      }
    })

    return res.status(200).json({ users })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
}

module.exports = { createUser, getAllUsers }
