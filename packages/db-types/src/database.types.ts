export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      climate_zones: {
        Row: {
          id: number
          koppen: string
          name: string
          notes: string | null
        }
        Insert: {
          id?: number
          koppen: string
          name: string
          notes?: string | null
        }
        Update: {
          id?: number
          koppen?: string
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
      grape_varietals: {
        Row: {
          id: number
          name: string
          parent_a: number | null
          parent_b: number | null
        }
        Insert: {
          id?: number
          name: string
          parent_a?: number | null
          parent_b?: number | null
        }
        Update: {
          id?: number
          name?: string
          parent_a?: number | null
          parent_b?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grape_varietals_parent_a_fkey"
            columns: ["parent_a"]
            isOneToOne: false
            referencedRelation: "grape_varietals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grape_varietals_parent_b_fkey"
            columns: ["parent_b"]
            isOneToOne: false
            referencedRelation: "grape_varietals"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          created_at: string | null
          id: string
          path: string
          tasting_id: string | null
          thumbnail_path: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          path: string
          tasting_id?: string | null
          thumbnail_path?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          path?: string
          tasting_id?: string | null
          thumbnail_path?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_tasting_id_fkey"
            columns: ["tasting_id"]
            isOneToOne: false
            referencedRelation: "tastings"
            referencedColumns: ["id"]
          },
        ]
      }
      producers: {
        Row: {
          created_at: string | null
          id: string
          location: unknown | null
          name: string
          region_id: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location?: unknown | null
          name: string
          region_id?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: unknown | null
          name?: string
          region_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "producers_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          climate_zone_id: number | null
          country: string
          created_at: string | null
          geom: unknown | null
          id: string
          name: string
        }
        Insert: {
          climate_zone_id?: number | null
          country: string
          created_at?: string | null
          geom?: unknown | null
          id?: string
          name: string
        }
        Update: {
          climate_zone_id?: number | null
          country?: string
          created_at?: string | null
          geom?: unknown | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "regions_climate_zone_id_fkey"
            columns: ["climate_zone_id"]
            isOneToOne: false
            referencedRelation: "climate_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_favorites: {
        Row: {
          created_at: string | null
          id: string
          restaurant_name: string
          url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          restaurant_name: string
          url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          restaurant_name?: string
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      scans: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          image_path: string
          matched_vintage_id: string | null
          ocr_text: string | null
          user_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          image_path: string
          matched_vintage_id?: string | null
          ocr_text?: string | null
          user_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          image_path?: string
          matched_vintage_id?: string | null
          ocr_text?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scans_matched_vintage_id_fkey"
            columns: ["matched_vintage_id"]
            isOneToOne: false
            referencedRelation: "vintages"
            referencedColumns: ["id"]
          },
        ]
      }
      soil_types: {
        Row: {
          description: string | null
          id: number
          name: string
        }
        Insert: {
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      tastings: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          tasted_at: string | null
          updated_at: string | null
          user_id: string | null
          verdict: number | null
          vintage_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          tasted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          verdict?: number | null
          vintage_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          tasted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          verdict?: number | null
          vintage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tastings_vintage_id_fkey"
            columns: ["vintage_id"]
            isOneToOne: false
            referencedRelation: "vintages"
            referencedColumns: ["id"]
          },
        ]
      }
      vineyards: {
        Row: {
          block_name: string | null
          centroid: unknown | null
          created_at: string | null
          id: string
          location: unknown | null
          name: string
          producer_id: string | null
          region_id: string | null
          soil_type_id: number | null
        }
        Insert: {
          block_name?: string | null
          centroid?: unknown | null
          created_at?: string | null
          id?: string
          location?: unknown | null
          name: string
          producer_id?: string | null
          region_id?: string | null
          soil_type_id?: number | null
        }
        Update: {
          block_name?: string | null
          centroid?: unknown | null
          created_at?: string | null
          id?: string
          location?: unknown | null
          name?: string
          producer_id?: string | null
          region_id?: string | null
          soil_type_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vineyards_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vineyards_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vineyards_soil_type_id_fkey"
            columns: ["soil_type_id"]
            isOneToOne: false
            referencedRelation: "soil_types"
            referencedColumns: ["id"]
          },
        ]
      }
      vintages: {
        Row: {
          abv: number | null
          climate_zone_id: number | null
          created_at: string | null
          id: string
          soil_type_id: number | null
          varietal_vector: string | null
          vineyard_id: string | null
          wine_id: string | null
          year: number | null
        }
        Insert: {
          abv?: number | null
          climate_zone_id?: number | null
          created_at?: string | null
          id?: string
          soil_type_id?: number | null
          varietal_vector?: string | null
          vineyard_id?: string | null
          wine_id?: string | null
          year?: number | null
        }
        Update: {
          abv?: number | null
          climate_zone_id?: number | null
          created_at?: string | null
          id?: string
          soil_type_id?: number | null
          varietal_vector?: string | null
          vineyard_id?: string | null
          wine_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vintages_climate_zone_id_fkey"
            columns: ["climate_zone_id"]
            isOneToOne: false
            referencedRelation: "climate_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vintages_soil_type_id_fkey"
            columns: ["soil_type_id"]
            isOneToOne: false
            referencedRelation: "soil_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vintages_vineyard_id_fkey"
            columns: ["vineyard_id"]
            isOneToOne: false
            referencedRelation: "vineyards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vintages_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      wine_list_items: {
        Row: {
          confidence: number | null
          country: string | null
          created_at: string | null
          guessed_vintage_year: number | null
          guessed_wine_id: string | null
          id: string
          position: number | null
          price_cents: number | null
          raw_text: string
          region: string | null
          varietal: string | null
          wine_list_id: string | null
        }
        Insert: {
          confidence?: number | null
          country?: string | null
          created_at?: string | null
          guessed_vintage_year?: number | null
          guessed_wine_id?: string | null
          id?: string
          position?: number | null
          price_cents?: number | null
          raw_text: string
          region?: string | null
          varietal?: string | null
          wine_list_id?: string | null
        }
        Update: {
          confidence?: number | null
          country?: string | null
          created_at?: string | null
          guessed_vintage_year?: number | null
          guessed_wine_id?: string | null
          id?: string
          position?: number | null
          price_cents?: number | null
          raw_text?: string
          region?: string | null
          varietal?: string | null
          wine_list_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wine_list_items_guessed_wine_id_fkey"
            columns: ["guessed_wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wine_list_items_wine_list_id_fkey"
            columns: ["wine_list_id"]
            isOneToOne: false
            referencedRelation: "wine_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      wine_lists: {
        Row: {
          id: string
          parsed_at: string | null
          restaurant_name: string | null
          restaurant_url: string | null
          source_type: string | null
          source_url: string | null
        }
        Insert: {
          id?: string
          parsed_at?: string | null
          restaurant_name?: string | null
          restaurant_url?: string | null
          source_type?: string | null
          source_url?: string | null
        }
        Update: {
          id?: string
          parsed_at?: string | null
          restaurant_name?: string | null
          restaurant_url?: string | null
          source_type?: string | null
          source_url?: string | null
        }
        Relationships: []
      }
      wine_varietals: {
        Row: {
          percent: number | null
          varietal_id: number
          vintage_id: string
        }
        Insert: {
          percent?: number | null
          varietal_id: number
          vintage_id: string
        }
        Update: {
          percent?: number | null
          varietal_id?: number
          vintage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wine_varietals_varietal_id_fkey"
            columns: ["varietal_id"]
            isOneToOne: false
            referencedRelation: "grape_varietals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wine_varietals_vintage_id_fkey"
            columns: ["vintage_id"]
            isOneToOne: false
            referencedRelation: "vintages"
            referencedColumns: ["id"]
          },
        ]
      }
      wines: {
        Row: {
          created_at: string | null
          id: string
          is_nv: boolean | null
          name: string
          producer_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_nv?: boolean | null
          name: string
          producer_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_nv?: boolean | null
          name?: string
          producer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wines_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never