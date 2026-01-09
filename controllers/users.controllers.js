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
      OS_type_user,      // <- dans le body, tu envoies ça
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

    // 1) créer le user auth
    const { data: authData, error: authError } =
      await req.supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true // pratique en dev
      })

    if (authError) {
      return res.status(400).json({ error: authError.message })
    }

    const userId = authData.user.id

    // 2) créer user_details (lié à auth.users via id)
    const { data: detailsData, error: detailsError } = await req.supabase
      .from('user_details')
      .insert({
        id: userId,

        auth_token: auth_token ?? null,
        first_name: first_name ?? null,
        last_name: last_name ?? null,
        gender: gender ?? null,

        has_agreed_cgu: has_agreed_cgu ?? false,
        is_admin_skailup: is_admin_skailup ?? false,
        is_submit_finalized: is_submit_finalized ?? false,

        last_connect: last_connect ?? null,
        time_diff: time_diff ?? null,

        // ⚠️ colonne "OS_type_user" (quoted identifier)
        "OS_type_user": OS_type_user ?? null,

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
      // rollback propre si l'insert échoue
      await req.supabase.auth.admin.deleteUser(userId)
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

module.exports = { createUser }
