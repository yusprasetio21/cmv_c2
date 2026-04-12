import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kxyluvntosmosbyybwqe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4eWx1dm50b3Ntb3NieXlid3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MjI5NDUsImV4cCI6MjA5MTQ5ODk0NX0.CMJ2g5zLRoGuMGc4z7Tj3Ti5oqYM3uE8BOpP73P5xF4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
