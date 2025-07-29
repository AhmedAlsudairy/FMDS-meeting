import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      meeting_segments: {
        Row: {
          id: string
          title: string
          duration: number
          days: string[]
          start_time: string | null
          end_time: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          duration: number
          days: string[]
          start_time?: string | null
          end_time?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          duration?: number
          days?: string[]
          start_time?: string | null
          end_time?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
