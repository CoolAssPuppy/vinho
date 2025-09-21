export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      climate_zones: {
        Row: {
          id: number;
          koppen: string;
          name: string;
          notes: string | null;
        };
        Insert: {
          id?: number;
          koppen: string;
          name: string;
          notes?: string | null;
        };
        Update: {
          id?: number;
          koppen?: string;
          name?: string;
          notes?: string | null;
        };
        Relationships: [];
      };
      grape_varietals: {
        Row: {
          id: number;
          name: string;
          parent_a: number | null;
          parent_b: number | null;
        };
        Insert: {
          id?: number;
          name: string;
          parent_a?: number | null;
          parent_b?: number | null;
        };
        Update: {
          id?: number;
          name?: string;
          parent_a?: number | null;
          parent_b?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "grape_varietals_parent_a_fkey";
            columns: ["parent_a"];
            isOneToOne: false;
            referencedRelation: "grape_varietals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grape_varietals_parent_b_fkey";
            columns: ["parent_b"];
            isOneToOne: false;
            referencedRelation: "grape_varietals";
            referencedColumns: ["id"];
          },
        ];
      };
      photos: {
        Row: {
          created_at: string | null;
          id: string;
          path: string;
          tasting_id: string | null;
          thumbnail_path: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          path: string;
          tasting_id?: string | null;
          thumbnail_path?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          path?: string;
          tasting_id?: string | null;
          thumbnail_path?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "photos_tasting_id_fkey";
            columns: ["tasting_id"];
            isOneToOne: false;
            referencedRelation: "tastings";
            referencedColumns: ["id"];
          },
        ];
      };
      producers: {
        Row: {
          created_at: string | null;
          id: string;
          location: unknown | null;
          name: string;
          region_id: string | null;
          website: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          location?: unknown | null;
          name: string;
          region_id?: string | null;
          website?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          location?: unknown | null;
          name?: string;
          region_id?: string | null;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "producers_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          description: string | null;
          favorite_regions: string[] | null;
          favorite_styles: string[] | null;
          favorite_varietals: string[] | null;
          first_name: string | null;
          id: string;
          last_name: string | null;
          price_range: Json | null;
          tasting_note_style: string | null;
          updated_at: string | null;
          wine_preferences: Json | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          description?: string | null;
          favorite_regions?: string[] | null;
          favorite_styles?: string[] | null;
          favorite_varietals?: string[] | null;
          first_name?: string | null;
          id: string;
          last_name?: string | null;
          price_range?: Json | null;
          tasting_note_style?: string | null;
          updated_at?: string | null;
          wine_preferences?: Json | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          description?: string | null;
          favorite_regions?: string[] | null;
          favorite_styles?: string[] | null;
          favorite_varietals?: string[] | null;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          price_range?: Json | null;
          tasting_note_style?: string | null;
          updated_at?: string | null;
          wine_preferences?: Json | null;
        };
        Relationships: [];
      };
      regions: {
        Row: {
          climate_zone_id: number | null;
          country: string;
          created_at: string | null;
          geom: unknown | null;
          id: string;
          name: string;
        };
        Insert: {
          climate_zone_id?: number | null;
          country: string;
          created_at?: string | null;
          geom?: unknown | null;
          id?: string;
          name: string;
        };
        Update: {
          climate_zone_id?: number | null;
          country?: string;
          created_at?: string | null;
          geom?: unknown | null;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "regions_climate_zone_id_fkey";
            columns: ["climate_zone_id"];
            isOneToOne: false;
            referencedRelation: "climate_zones";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurant_favorites: {
        Row: {
          created_at: string | null;
          id: string;
          restaurant_name: string;
          url: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          restaurant_name: string;
          url?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          restaurant_name?: string;
          url?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      scans: {
        Row: {
          confidence: number | null;
          created_at: string | null;
          id: string;
          image_path: string;
          matched_vintage_id: string | null;
          ocr_text: string | null;
          scan_image_url: string | null;
          user_id: string | null;
        };
        Insert: {
          confidence?: number | null;
          created_at?: string | null;
          id?: string;
          image_path: string;
          matched_vintage_id?: string | null;
          ocr_text?: string | null;
          scan_image_url?: string | null;
          user_id?: string | null;
        };
        Update: {
          confidence?: number | null;
          created_at?: string | null;
          id?: string;
          image_path?: string;
          matched_vintage_id?: string | null;
          ocr_text?: string | null;
          scan_image_url?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "scans_matched_vintage_id_fkey";
            columns: ["matched_vintage_id"];
            isOneToOne: false;
            referencedRelation: "vintages";
            referencedColumns: ["id"];
          },
        ];
      };
      soil_types: {
        Row: {
          description: string | null;
          id: number;
          name: string;
        };
        Insert: {
          description?: string | null;
          id?: number;
          name: string;
        };
        Update: {
          description?: string | null;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      spatial_ref_sys: {
        Row: {
          auth_name: string | null;
          auth_srid: number | null;
          proj4text: string | null;
          srid: number;
          srtext: string | null;
        };
        Insert: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid: number;
          srtext?: string | null;
        };
        Update: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid?: number;
          srtext?: string | null;
        };
        Relationships: [];
      };
      tastings: {
        Row: {
          created_at: string | null;
          id: string;
          notes: string | null;
          tasted_at: string | null;
          updated_at: string | null;
          user_id: string | null;
          verdict: number | null;
          vintage_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          notes?: string | null;
          tasted_at?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
          verdict?: number | null;
          vintage_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          notes?: string | null;
          tasted_at?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
          verdict?: number | null;
          vintage_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tastings_vintage_id_fkey";
            columns: ["vintage_id"];
            isOneToOne: false;
            referencedRelation: "vintages";
            referencedColumns: ["id"];
          },
        ];
      };
      vineyards: {
        Row: {
          block_name: string | null;
          centroid: unknown | null;
          created_at: string | null;
          id: string;
          location: unknown | null;
          name: string;
          producer_id: string | null;
          region_id: string | null;
          soil_type_id: number | null;
        };
        Insert: {
          block_name?: string | null;
          centroid?: unknown | null;
          created_at?: string | null;
          id?: string;
          location?: unknown | null;
          name: string;
          producer_id?: string | null;
          region_id?: string | null;
          soil_type_id?: number | null;
        };
        Update: {
          block_name?: string | null;
          centroid?: unknown | null;
          created_at?: string | null;
          id?: string;
          location?: unknown | null;
          name?: string;
          producer_id?: string | null;
          region_id?: string | null;
          soil_type_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "vineyards_producer_id_fkey";
            columns: ["producer_id"];
            isOneToOne: false;
            referencedRelation: "producers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vineyards_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vineyards_soil_type_id_fkey";
            columns: ["soil_type_id"];
            isOneToOne: false;
            referencedRelation: "soil_types";
            referencedColumns: ["id"];
          },
        ];
      };
      vintages: {
        Row: {
          abv: number | null;
          climate_zone_id: number | null;
          created_at: string | null;
          id: string;
          soil_type_id: number | null;
          vineyard_id: string | null;
          wine_id: string | null;
          year: number | null;
        };
        Insert: {
          abv?: number | null;
          climate_zone_id?: number | null;
          created_at?: string | null;
          id?: string;
          soil_type_id?: number | null;
          vineyard_id?: string | null;
          wine_id?: string | null;
          year?: number | null;
        };
        Update: {
          abv?: number | null;
          climate_zone_id?: number | null;
          created_at?: string | null;
          id?: string;
          soil_type_id?: number | null;
          vineyard_id?: string | null;
          wine_id?: string | null;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "vintages_climate_zone_id_fkey";
            columns: ["climate_zone_id"];
            isOneToOne: false;
            referencedRelation: "climate_zones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vintages_soil_type_id_fkey";
            columns: ["soil_type_id"];
            isOneToOne: false;
            referencedRelation: "soil_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vintages_vineyard_id_fkey";
            columns: ["vineyard_id"];
            isOneToOne: false;
            referencedRelation: "vineyards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vintages_wine_id_fkey";
            columns: ["wine_id"];
            isOneToOne: false;
            referencedRelation: "wines";
            referencedColumns: ["id"];
          },
        ];
      };
      wine_list_items: {
        Row: {
          confidence: number | null;
          country: string | null;
          created_at: string | null;
          guessed_vintage_year: number | null;
          guessed_wine_id: string | null;
          id: string;
          position: number | null;
          price_cents: number | null;
          raw_text: string;
          region: string | null;
          varietal: string | null;
          wine_list_id: string | null;
        };
        Insert: {
          confidence?: number | null;
          country?: string | null;
          created_at?: string | null;
          guessed_vintage_year?: number | null;
          guessed_wine_id?: string | null;
          id?: string;
          position?: number | null;
          price_cents?: number | null;
          raw_text: string;
          region?: string | null;
          varietal?: string | null;
          wine_list_id?: string | null;
        };
        Update: {
          confidence?: number | null;
          country?: string | null;
          created_at?: string | null;
          guessed_vintage_year?: number | null;
          guessed_wine_id?: string | null;
          id?: string;
          position?: number | null;
          price_cents?: number | null;
          raw_text?: string;
          region?: string | null;
          varietal?: string | null;
          wine_list_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wine_list_items_guessed_wine_id_fkey";
            columns: ["guessed_wine_id"];
            isOneToOne: false;
            referencedRelation: "wines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wine_list_items_wine_list_id_fkey";
            columns: ["wine_list_id"];
            isOneToOne: false;
            referencedRelation: "wine_lists";
            referencedColumns: ["id"];
          },
        ];
      };
      wine_lists: {
        Row: {
          id: string;
          parsed_at: string | null;
          restaurant_name: string | null;
          restaurant_url: string | null;
          source_type: string | null;
          source_url: string | null;
        };
        Insert: {
          id?: string;
          parsed_at?: string | null;
          restaurant_name?: string | null;
          restaurant_url?: string | null;
          source_type?: string | null;
          source_url?: string | null;
        };
        Update: {
          id?: string;
          parsed_at?: string | null;
          restaurant_name?: string | null;
          restaurant_url?: string | null;
          source_type?: string | null;
          source_url?: string | null;
        };
        Relationships: [];
      };
      wine_varietals: {
        Row: {
          percent: number | null;
          varietal_id: number;
          vintage_id: string;
        };
        Insert: {
          percent?: number | null;
          varietal_id: number;
          vintage_id: string;
        };
        Update: {
          percent?: number | null;
          varietal_id?: number;
          vintage_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wine_varietals_varietal_id_fkey";
            columns: ["varietal_id"];
            isOneToOne: false;
            referencedRelation: "grape_varietals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wine_varietals_vintage_id_fkey";
            columns: ["vintage_id"];
            isOneToOne: false;
            referencedRelation: "vintages";
            referencedColumns: ["id"];
          },
        ];
      };
      wines: {
        Row: {
          created_at: string | null;
          id: string;
          is_nv: boolean | null;
          name: string;
          producer_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_nv?: boolean | null;
          name: string;
          producer_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_nv?: boolean | null;
          name?: string;
          producer_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wines_producer_id_fkey";
            columns: ["producer_id"];
            isOneToOne: false;
            referencedRelation: "producers";
            referencedColumns: ["id"];
          },
        ];
      };
      wines_added: {
        Row: {
          created_at: string | null;
          error_message: string | null;
          id: string;
          image_url: string;
          ocr_text: string | null;
          processed_at: string | null;
          processed_data: Json | null;
          retry_count: number | null;
          scan_id: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          image_url: string;
          ocr_text?: string | null;
          processed_at?: string | null;
          processed_data?: Json | null;
          retry_count?: number | null;
          scan_id?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          image_url?: string;
          ocr_text?: string | null;
          processed_at?: string | null;
          processed_data?: Json | null;
          retry_count?: number | null;
          scan_id?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wines_added_scan_id_fkey";
            columns: ["scan_id"];
            isOneToOne: false;
            referencedRelation: "scans";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null;
          f_geography_column: unknown | null;
          f_table_catalog: unknown | null;
          f_table_name: unknown | null;
          f_table_schema: unknown | null;
          srid: number | null;
          type: string | null;
        };
        Relationships: [];
      };
      geometry_columns: {
        Row: {
          coord_dimension: number | null;
          f_geometry_column: unknown | null;
          f_table_catalog: string | null;
          f_table_name: unknown | null;
          f_table_schema: unknown | null;
          srid: number | null;
          type: string | null;
        };
        Insert: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown | null;
          f_table_catalog?: string | null;
          f_table_name?: unknown | null;
          f_table_schema?: unknown | null;
          srid?: number | null;
          type?: string | null;
        };
        Update: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown | null;
          f_table_catalog?: string | null;
          f_table_name?: unknown | null;
          f_table_schema?: unknown | null;
          srid?: number | null;
          type?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
