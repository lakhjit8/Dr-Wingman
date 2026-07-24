function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Copy tests/.env.test.example to tests/.env.test and fill it in, ` +
        `or set it in your CI secrets.`
    )
  }
  return value
}

export const env = {
  get SUPABASE_URL() {
    return required('SUPABASE_URL')
  },
  get SUPABASE_ANON_KEY() {
    return required('SUPABASE_ANON_KEY')
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return required('SUPABASE_SERVICE_ROLE_KEY')
  },
  get SUPABASE_ACCESS_TOKEN() {
    return required('SUPABASE_ACCESS_TOKEN')
  },
  get SUPABASE_PROJECT_REF() {
    return required('SUPABASE_PROJECT_REF')
  },
  get TEST_MODE_SECRET() {
    return required('TEST_MODE_SECRET')
  },
}
