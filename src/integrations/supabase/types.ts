export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          audience: string
          author_id: string
          body: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          audience?: string
          author_id: string
          body: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          audience?: string
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          course_id: string
          created_at: string
          date: string
          id: string
          note: string | null
          status: string
          student_id: string
          teacher_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          status?: string
          student_id: string
          teacher_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          status?: string
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          action_config: Json
          action_type: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      automation_runs: {
        Row: {
          created_at: string
          id: string
          message: string | null
          payload: Json | null
          rule_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          payload?: Json | null
          rule_id?: string | null
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          payload?: Json | null
          rule_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          category: string
          created_at: string
          id: string
          notes: string | null
          period_month: string
          planned_amount: number
          spent_amount: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          notes?: string | null
          period_month: string
          planned_amount?: number
          spent_amount?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          period_month?: string
          planned_amount?: number
          spent_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      course_chunks: {
        Row: {
          content: string
          course_id: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json
          topic_id: string | null
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          topic_id?: string | null
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_chunks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_chunks_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      course_homework_grades: {
        Row: {
          course_id: string
          created_at: string
          feedback: string | null
          grade: number
          graded_by: string
          id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          feedback?: string | null
          grade: number
          graded_by: string
          id?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          feedback?: string | null
          grade?: number
          graded_by?: string
          id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_homework_grades_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          ai_processed: boolean
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          drejtimi: Database["public"]["Enums"]["drejtimi_enum"]
          email_notifications: boolean
          id: string
          is_featured: boolean
          klasa: Database["public"]["Enums"]["klasa_enum"]
          paralelja: Database["public"]["Enums"]["paralelja_enum"] | null
          pdf_path: string | null
          prerequisites: string[]
          status: Database["public"]["Enums"]["course_status"]
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_processed?: boolean
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          drejtimi: Database["public"]["Enums"]["drejtimi_enum"]
          email_notifications?: boolean
          id?: string
          is_featured?: boolean
          klasa: Database["public"]["Enums"]["klasa_enum"]
          paralelja?: Database["public"]["Enums"]["paralelja_enum"] | null
          pdf_path?: string | null
          prerequisites?: string[]
          status?: Database["public"]["Enums"]["course_status"]
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_processed?: boolean
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          drejtimi?: Database["public"]["Enums"]["drejtimi_enum"]
          email_notifications?: boolean
          id?: string
          is_featured?: boolean
          klasa?: Database["public"]["Enums"]["klasa_enum"]
          paralelja?: Database["public"]["Enums"]["paralelja_enum"] | null
          pdf_path?: string | null
          prerequisites?: string[]
          status?: Database["public"]["Enums"]["course_status"]
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_communications: {
        Row: {
          body: string | null
          contact_id: string
          created_at: string
          created_by: string | null
          id: string
          occurred_at: string
          subject: string | null
          type: Database["public"]["Enums"]["communication_type"]
        }
        Insert: {
          body?: string | null
          contact_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          occurred_at?: string
          subject?: string | null
          type: Database["public"]["Enums"]["communication_type"]
        }
        Update: {
          body?: string | null
          contact_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          occurred_at?: string
          subject?: string | null
          type?: Database["public"]["Enums"]["communication_type"]
        }
        Relationships: [
          {
            foreignKeyName: "crm_communications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          company: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          notes: string | null
          owner_id: string | null
          phone: string | null
          tags: string[] | null
          type: Database["public"]["Enums"]["contact_type"]
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["contact_type"]
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["contact_type"]
          updated_at?: string
        }
        Relationships: []
      }
      crm_leads: {
        Row: {
          assigned_to: string | null
          contact_id: string
          created_at: string
          drejtimi_interes: string | null
          id: string
          stage_id: string
          title: string
          updated_at: string
          value_notes: string | null
        }
        Insert: {
          assigned_to?: string | null
          contact_id: string
          created_at?: string
          drejtimi_interes?: string | null
          id?: string
          stage_id: string
          title: string
          updated_at?: string
          value_notes?: string | null
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string
          created_at?: string
          drejtimi_interes?: string | null
          id?: string
          stage_id?: string
          title?: string
          updated_at?: string
          value_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipeline_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          order_index: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          order_index?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: []
      }
      crm_tickets: {
        Row: {
          assigned_to: string | null
          contact_id: string | null
          created_at: string
          description: string | null
          id: string
          opened_by: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          opened_by?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          opened_by?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tickets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          attempts: number
          body: string | null
          channel: string
          created_at: string
          error: string | null
          event: string | null
          id: string
          provider_id: string | null
          recipient: string
          status: string
          subject: string
        }
        Insert: {
          attempts?: number
          body?: string | null
          channel?: string
          created_at?: string
          error?: string | null
          event?: string | null
          id?: string
          provider_id?: string | null
          recipient: string
          status?: string
          subject: string
        }
        Update: {
          attempts?: number
          body?: string | null
          channel?: string
          created_at?: string
          error?: string | null
          event?: string | null
          id?: string
          provider_id?: string | null
          recipient?: string
          status?: string
          subject?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          course_id: string
          created_at: string
          duration_min: number
          id: string
          room: string | null
          scheduled_at: string
          teacher_id: string
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          duration_min?: number
          id?: string
          room?: string | null
          scheduled_at: string
          teacher_id: string
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          duration_min?: number
          id?: string
          room?: string | null
          scheduled_at?: string
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          instructions: string
          topic_id: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          instructions: string
          topic_id: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          instructions?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          created_at: string
          feedback: string | null
          file_path: string
          grade: number | null
          homework_id: string
          id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          file_path: string
          grade?: number | null
          homework_id: string
          id?: string
          student_id: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          file_path?: string
          grade?: number | null
          homework_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          quantity: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          due_date: string | null
          id: string
          notes: string | null
          number: string
          status: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          number: string
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          number?: string
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      library_resources: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          external_url: string | null
          file_path: string | null
          id: string
          title: string
          uploaded_by: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_path?: string | null
          id?: string
          title: string
          uploaded_by: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_path?: string | null
          id?: string
          title?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_resources_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      parent_links: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          method: string
          paid_at: string
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          method?: string
          paid_at?: string
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          method?: string
          paid_at?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          drejtimi: Database["public"]["Enums"]["drejtimi_enum"] | null
          email: string
          first_name: string
          id: string
          klasa: Database["public"]["Enums"]["klasa_enum"] | null
          last_name: string
          paralelja: Database["public"]["Enums"]["paralelja_enum"] | null
        }
        Insert: {
          created_at?: string
          drejtimi?: Database["public"]["Enums"]["drejtimi_enum"] | null
          email: string
          first_name: string
          id: string
          klasa?: Database["public"]["Enums"]["klasa_enum"] | null
          last_name: string
          paralelja?: Database["public"]["Enums"]["paralelja_enum"] | null
        }
        Update: {
          created_at?: string
          drejtimi?: Database["public"]["Enums"]["drejtimi_enum"] | null
          email?: string
          first_name?: string
          id?: string
          klasa?: Database["public"]["Enums"]["klasa_enum"] | null
          last_name?: string
          paralelja?: Database["public"]["Enums"]["paralelja_enum"] | null
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          description: string
          id: string
          item_id: string | null
          po_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          item_id?: string | null
          po_id: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          description?: string
          id?: string
          item_id?: string | null
          po_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_at: string | null
          id: string
          notes: string | null
          status: string
          supplier: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          supplier: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          supplier?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          created_at: string
          final_grade: number | null
          grade: number
          id: string
          needs_review: boolean
          quiz_id: string
          reviewed: boolean
          reviewed_by: string | null
          score: number
          student_id: string
          teacher_feedback: string | null
        }
        Insert: {
          answers: Json
          created_at?: string
          final_grade?: number | null
          grade: number
          id?: string
          needs_review?: boolean
          quiz_id: string
          reviewed?: boolean
          reviewed_by?: string | null
          score: number
          student_id: string
          teacher_feedback?: string | null
        }
        Update: {
          answers?: Json
          created_at?: string
          final_grade?: number | null
          grade?: number
          id?: string
          needs_review?: boolean
          quiz_id?: string
          reviewed?: boolean
          reviewed_by?: string | null
          score?: number
          student_id?: string
          teacher_feedback?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_index: number
          created_at: string
          id: string
          options: Json
          position: number
          question: string
          quiz_id: string
        }
        Insert: {
          correct_index?: number
          created_at?: string
          id?: string
          options?: Json
          position?: number
          question: string
          quiz_id: string
        }
        Update: {
          correct_index?: number
          created_at?: string
          id?: string
          options?: Json
          position?: number
          question?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          id: string
          questions: Json
          title: string
          topic_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          questions?: Json
          title: string
          topic_id: string
        }
        Update: {
          created_at?: string
          id?: string
          questions?: Json
          title?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule: {
        Row: {
          course_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          room: string | null
          start_time: string
          teacher_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          room?: string | null
          start_time: string
          teacher_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          room?: string | null
          start_time?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          delta: number
          id: string
          item_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delta: number
          id?: string
          item_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delta?: number
          id?: string
          item_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_progress: {
        Row: {
          completed_at: string
          id: string
          student_id: string
          topic_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          student_id: string
          topic_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          student_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          course_id: string
          created_at: string
          deleted_at: string | null
          examples: string | null
          exercises: string | null
          exercises_solved: string | null
          explanation: string | null
          id: string
          is_final: boolean
          is_test: boolean
          objectives: string | null
          order_index: number
          presentation: string | null
          summary: string | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          deleted_at?: string | null
          examples?: string | null
          exercises?: string | null
          exercises_solved?: string | null
          explanation?: string | null
          id?: string
          is_final?: boolean
          is_test?: boolean
          objectives?: string | null
          order_index: number
          presentation?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          deleted_at?: string | null
          examples?: string | null
          exercises?: string | null
          exercises_solved?: string | null
          explanation?: string | null
          id?: string
          is_final?: boolean
          is_test?: boolean
          objectives?: string | null
          order_index?: number
          presentation?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          onboarding_dismissed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          onboarding_dismissed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          onboarding_dismissed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_course_chunks: {
        Args: {
          filter_course?: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          content: string
          course_id: string
          id: string
          similarity: number
          topic_id: string
        }[]
      }
    }
    Enums: {
      app_role: "teacher" | "student" | "admin" | "parent"
      communication_type: "email" | "phone" | "meeting" | "sms" | "note"
      contact_type: "parent" | "business" | "alumni" | "supplier" | "other"
      course_status: "draft" | "published"
      drejtimi_enum: "Elektroteknike" | "TIK"
      enrollment_status: "pending" | "approved" | "rejected"
      klasa_enum: "10" | "11" | "12" | "13"
      paralelja_enum: "A" | "B" | "C" | "D"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["teacher", "student", "admin", "parent"],
      communication_type: ["email", "phone", "meeting", "sms", "note"],
      contact_type: ["parent", "business", "alumni", "supplier", "other"],
      course_status: ["draft", "published"],
      drejtimi_enum: ["Elektroteknike", "TIK"],
      enrollment_status: ["pending", "approved", "rejected"],
      klasa_enum: ["10", "11", "12", "13"],
      paralelja_enum: ["A", "B", "C", "D"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
    },
  },
} as const
