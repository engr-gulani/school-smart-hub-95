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
          body: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          title: string
        }
        Insert: {
          audience?: string
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          title: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          class_teacher_id: string | null
          created_at: string
          id: string
          level: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          class_teacher_id?: string | null
          created_at?: string
          id: string
          level: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          class_teacher_id?: string | null
          created_at?: string
          id?: string
          level?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_class_teacher_id_fkey"
            columns: ["class_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admission_no: string | null
          class_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          staff_id: string | null
          updated_at: string
        }
        Insert: {
          admission_no?: string | null
          class_id?: string | null
          created_at?: string
          email: string
          full_name?: string
          id: string
          staff_id?: string | null
          updated_at?: string
        }
        Update: {
          admission_no?: string | null
          class_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          staff_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          average: number
          created_at: string
          decided_by: string | null
          decision: string
          from_class_id: string | null
          id: string
          session: string
          student_id: string
          terms_counted: number
          to_class_id: string | null
          updated_at: string
        }
        Insert: {
          average?: number
          created_at?: string
          decided_by?: string | null
          decision?: string
          from_class_id?: string | null
          id?: string
          session: string
          student_id: string
          terms_counted?: number
          to_class_id?: string | null
          updated_at?: string
        }
        Update: {
          average?: number
          created_at?: string
          decided_by?: string | null
          decision?: string
          from_class_id?: string | null
          id?: string
          session?: string
          student_id?: string
          terms_counted?: number
          to_class_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_from_class_id_fkey"
            columns: ["from_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_to_class_id_fkey"
            columns: ["to_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      result_approvals: {
        Row: {
          class_id: string
          created_at: string
          id: string
          principal_approved_at: string | null
          principal_approved_by: string | null
          published_at: string | null
          published_by: string | null
          stage: string
          submitted_at: string | null
          submitted_by: string | null
          term_id: string
          updated_at: string
          vp_approved_at: string | null
          vp_approved_by: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          principal_approved_at?: string | null
          principal_approved_by?: string | null
          published_at?: string | null
          published_by?: string | null
          stage?: string
          submitted_at?: string | null
          submitted_by?: string | null
          term_id?: string
          updated_at?: string
          vp_approved_at?: string | null
          vp_approved_by?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          principal_approved_at?: string | null
          principal_approved_by?: string | null
          published_at?: string | null
          published_by?: string | null
          stage?: string
          submitted_at?: string | null
          submitted_by?: string | null
          term_id?: string
          updated_at?: string
          vp_approved_at?: string | null
          vp_approved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "result_approvals_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_approvals_principal_approved_by_fkey"
            columns: ["principal_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_approvals_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_approvals_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_approvals_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_approvals_vp_approved_by_fkey"
            columns: ["vp_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_settings: {
        Row: {
          created_at: string
          current_term_id: string | null
          id: string
          next_term_begins: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_term_id?: string | null
          id?: string
          next_term_begins?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_term_id?: string | null
          id?: string
          next_term_begins?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_settings_current_term_id_fkey"
            columns: ["current_term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          assignment: number
          ca1: number
          ca2: number
          created_at: string
          entered_by: string | null
          exam: number
          id: string
          student_id: string
          subject_id: string
          term_id: string
          updated_at: string
        }
        Insert: {
          assignment?: number
          ca1?: number
          ca2?: number
          created_at?: string
          entered_by?: string | null
          exam?: number
          id?: string
          student_id: string
          subject_id: string
          term_id?: string
          updated_at?: string
        }
        Update: {
          assignment?: number
          ca1?: number
          ca2?: number
          created_at?: string
          entered_by?: string | null
          exam?: number
          id?: string
          student_id?: string
          subject_id?: string
          term_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          admission_no: string
          class_id: string
          created_at: string
          dob: string | null
          full_name: string
          gender: string
          id: string
          parent_name: string | null
          parent_phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          admission_no: string
          class_id: string
          created_at?: string
          dob?: string | null
          full_name: string
          gender?: string
          id: string
          parent_name?: string | null
          parent_phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          admission_no?: string
          class_id?: string
          created_at?: string
          dob?: string | null
          full_name?: string
          gender?: string
          id?: string
          parent_name?: string | null
          parent_phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          class_id: string
          code: string
          created_at: string
          id: string
          name: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          class_id: string
          code: string
          created_at?: string
          id: string
          name: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string
          code?: string
          created_at?: string
          id?: string
          name?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          created_at: string
          ends_on: string | null
          id: string
          name: string
          session: string
          sort_order: number
          starts_on: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_on?: string | null
          id: string
          name: string
          session: string
          sort_order?: number
          starts_on?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_on?: string | null
          id?: string
          name?: string
          session?: string
          sort_order?: number
          starts_on?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "school_admin"
        | "principal"
        | "vp_academic"
        | "class_teacher"
        | "subject_teacher"
        | "student"
        | "accountant"
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
      app_role: [
        "super_admin",
        "school_admin",
        "principal",
        "vp_academic",
        "class_teacher",
        "subject_teacher",
        "student",
        "accountant",
      ],
    },
  },
} as const
