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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      embedding_jobs_queue: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string | null
          input_image_url: string | null
          input_text: string | null
          job_type: string
          priority: number
          processed_at: string | null
          retry_count: number
          scan_id: string | null
          status: string
          vintage_id: string | null
          wine_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          input_image_url?: string | null
          input_text?: string | null
          job_type: string
          priority?: number
          processed_at?: string | null
          retry_count?: number
          scan_id?: string | null
          status?: string
          vintage_id?: string | null
          wine_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          input_image_url?: string | null
          input_text?: string | null
          job_type?: string
          priority?: number
          processed_at?: string | null
          retry_count?: number
          scan_id?: string | null
          status?: string
          vintage_id?: string | null
          wine_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "embedding_jobs_queue_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embedding_jobs_queue_vintage_id_fkey"
            columns: ["vintage_id"]
            isOneToOne: false
            referencedRelation: "vintages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embedding_jobs_queue_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      grape_varietals: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      expert_ratings: {
        Row: {
          id: string
          vintage_id: string | null
          wine_id: string | null
          rating: number | null
          rating_count: number | null
          source: string
          source_url: string | null
          source_wine_id: string | null
          fetched_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          vintage_id?: string | null
          wine_id?: string | null
          rating?: number | null
          rating_count?: number | null
          source?: string
          source_url?: string | null
          source_wine_id?: string | null
          fetched_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          vintage_id?: string | null
          wine_id?: string | null
          rating?: number | null
          rating_count?: number | null
          source?: string
          source_url?: string | null
          source_wine_id?: string | null
          fetched_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expert_ratings_vintage_id_fkey"
            columns: ["vintage_id"]
            isOneToOne: false
            referencedRelation: "vintages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expert_ratings_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      label_embeddings: {
        Row: {
          created_at: string
          embedding_model: string
          embedding_version: number
          id: string
          image_quality_score: number | null
          label_embedding: string | null
          ocr_confidence: number | null
          ocr_text: string | null
          source_image_url: string | null
          source_scan_id: string | null
          vintage_id: string | null
          wine_id: string
        }
        Insert: {
          created_at?: string
          embedding_model?: string
          embedding_version?: number
          id?: string
          image_quality_score?: number | null
          label_embedding?: string | null
          ocr_confidence?: number | null
          ocr_text?: string | null
          source_image_url?: string | null
          source_scan_id?: string | null
          vintage_id?: string | null
          wine_id: string
        }
        Update: {
          created_at?: string
          embedding_model?: string
          embedding_version?: number
          id?: string
          image_quality_score?: number | null
          label_embedding?: string | null
          ocr_confidence?: number | null
          ocr_text?: string | null
          source_image_url?: string | null
          source_scan_id?: string | null
          vintage_id?: string | null
          wine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "label_embeddings_source_scan_id_fkey"
            columns: ["source_scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "label_embeddings_vintage_id_fkey"
            columns: ["vintage_id"]
            isOneToOne: false
            referencedRelation: "vintages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "label_embeddings_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
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
          address: string | null
          city: string | null
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          postal_code: string | null
          region_id: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          postal_code?: string | null
          region_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          postal_code?: string | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          description: string | null
          favorite_regions: string[] | null
          favorite_styles: string[] | null
          favorite_varietals: string[] | null
          first_name: string | null
          id: string
          last_name: string | null
          price_range: Json | null
          tasting_note_style: string | null
          updated_at: string | null
          wine_preferences: Json | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          favorite_regions?: string[] | null
          favorite_styles?: string[] | null
          favorite_varietals?: string[] | null
          first_name?: string | null
          id: string
          last_name?: string | null
          price_range?: Json | null
          tasting_note_style?: string | null
          updated_at?: string | null
          wine_preferences?: Json | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          favorite_regions?: string[] | null
          favorite_styles?: string[] | null
          favorite_varietals?: string[] | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          price_range?: Json | null
          tasting_note_style?: string | null
          updated_at?: string | null
          wine_preferences?: Json | null
        }
        Relationships: []
      }
      regions: {
        Row: {
          country: string
          created_at: string | null
          geom: unknown
          id: string
          latitude: number | null
          longitude: number | null
          name: string
        }
        Insert: {
          country: string
          created_at?: string | null
          geom?: unknown
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
        }
        Update: {
          country?: string
          created_at?: string | null
          geom?: unknown
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
        }
        Relationships: []
      }
      scans: {
        Row: {
          confidence: number | null
          contributed_to_embeddings: boolean
          created_at: string | null
          id: string
          image_path: string
          match_method: string | null
          matched_vintage_id: string | null
          ocr_text: string | null
          scan_image_url: string | null
          user_id: string | null
          vector_similarity: number | null
        }
        Insert: {
          confidence?: number | null
          contributed_to_embeddings?: boolean
          created_at?: string | null
          id?: string
          image_path: string
          match_method?: string | null
          matched_vintage_id?: string | null
          ocr_text?: string | null
          scan_image_url?: string | null
          user_id?: string | null
          vector_similarity?: number | null
        }
        Update: {
          confidence?: number | null
          contributed_to_embeddings?: boolean
          created_at?: string | null
          id?: string
          image_path?: string
          match_method?: string | null
          matched_vintage_id?: string | null
          ocr_text?: string | null
          scan_image_url?: string | null
          user_id?: string | null
          vector_similarity?: number | null
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
      sharing_connections: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          invite_code: string | null
          sharer_id: string
          status: string
          updated_at: string
          used_at: string | null
          viewer_email: string | null
          viewer_id: string | null
          viewer_phone: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          invite_code?: string | null
          sharer_id: string
          status: string
          updated_at?: string
          used_at?: string | null
          viewer_email?: string | null
          viewer_id?: string | null
          viewer_phone?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          invite_code?: string | null
          sharer_id?: string
          status?: string
          updated_at?: string
          used_at?: string | null
          viewer_email?: string | null
          viewer_id?: string | null
          viewer_phone?: string | null
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      tastings: {
        Row: {
          created_at: string | null
          detailed_notes: string | null
          embedding: string | null
          id: string
          image_url: string | null
          location_address: string | null
          location_city: string | null
          location_latitude: number | null
          location_longitude: number | null
          location_name: string | null
          notes: string | null
          search_text: string | null
          tasted_at: string | null
          updated_at: string | null
          user_id: string | null
          verdict: number | null
          vintage_id: string | null
        }
        Insert: {
          created_at?: string | null
          detailed_notes?: string | null
          embedding?: string | null
          id?: string
          image_url?: string | null
          location_address?: string | null
          location_city?: string | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_name?: string | null
          notes?: string | null
          search_text?: string | null
          tasted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          verdict?: number | null
          vintage_id?: string | null
        }
        Update: {
          created_at?: string | null
          detailed_notes?: string | null
          embedding?: string | null
          id?: string
          image_url?: string | null
          location_address?: string | null
          location_city?: string | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_name?: string | null
          notes?: string | null
          search_text?: string | null
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
      user_sharing_preferences: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          visible_sharers: Json
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          visible_sharers?: Json
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          visible_sharers?: Json
        }
        Relationships: []
      }
      vintages: {
        Row: {
          abv: number | null
          community_rating: number | null
          community_rating_count: number | null
          created_at: string | null
          id: string
          wine_id: string | null
          year: number | null
        }
        Insert: {
          abv?: number | null
          community_rating?: number | null
          community_rating_count?: number | null
          created_at?: string | null
          id?: string
          wine_id?: string | null
          year?: number | null
        }
        Update: {
          abv?: number | null
          community_rating?: number | null
          community_rating_count?: number | null
          created_at?: string | null
          id?: string
          wine_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vintages_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      wine_embeddings: {
        Row: {
          created_at: string
          data_completeness_score: number
          embedding_model: string
          embedding_version: number
          id: string
          identity_embedding: string | null
          identity_text: string
          updated_at: string
          wine_id: string
        }
        Insert: {
          created_at?: string
          data_completeness_score?: number
          embedding_model?: string
          embedding_version?: number
          id?: string
          identity_embedding?: string | null
          identity_text: string
          updated_at?: string
          wine_id: string
        }
        Update: {
          created_at?: string
          data_completeness_score?: number
          embedding_model?: string
          embedding_version?: number
          id?: string
          identity_embedding?: string | null
          identity_text?: string
          updated_at?: string
          wine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wine_embeddings_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      wine_recommendations_cache: {
        Row: {
          based_on_wines: Json
          city: string
          created_at: string
          id: string
          recommendations: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          based_on_wines: Json
          city: string
          created_at?: string
          id?: string
          recommendations: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          based_on_wines?: Json
          city?: string
          created_at?: string
          id?: string
          recommendations?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wine_varietals: {
        Row: {
          created_at: string | null
          id: string
          percentage: number | null
          varietal_id: string | null
          vintage_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          percentage?: number | null
          varietal_id?: string | null
          vintage_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          percentage?: number | null
          varietal_id?: string | null
          vintage_id?: string | null
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
          color: string | null
          created_at: string | null
          food_pairings: Json | null
          id: string
          image_url: string | null
          is_nv: boolean | null
          is_vectorized: boolean
          name: string
          producer_id: string | null
          serving_temperature: string | null
          style: string | null
          tasting_notes: string | null
          varietal: string | null
          wine_type: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          food_pairings?: Json | null
          id?: string
          image_url?: string | null
          is_nv?: boolean | null
          is_vectorized?: boolean
          name: string
          producer_id?: string | null
          serving_temperature?: string | null
          style?: string | null
          tasting_notes?: string | null
          varietal?: string | null
          wine_type?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          food_pairings?: Json | null
          id?: string
          image_url?: string | null
          is_nv?: boolean | null
          is_vectorized?: boolean
          name?: string
          producer_id?: string | null
          serving_temperature?: string | null
          style?: string | null
          tasting_notes?: string | null
          varietal?: string | null
          wine_type?: string | null
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
      wines_added_queue: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          idempotency_key: string | null
          image_url: string
          ocr_text: string | null
          pending_tasting_notes: Json | null
          processed_at: string | null
          processed_data: Json | null
          retry_count: number | null
          scan_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          image_url: string
          ocr_text?: string | null
          pending_tasting_notes?: Json | null
          processed_at?: string | null
          processed_data?: Json | null
          retry_count?: number | null
          scan_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          image_url?: string
          ocr_text?: string | null
          pending_tasting_notes?: Json | null
          processed_at?: string | null
          processed_data?: Json | null
          retry_count?: number | null
          scan_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wines_added_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      wines_enrichment_queue: {
        Row: {
          country: string | null
          created_at: string | null
          enrichment_data: Json | null
          error_message: string | null
          existing_varietals: string[] | null
          id: string
          priority: number | null
          processed_at: string | null
          producer_name: string
          region: string | null
          retry_count: number | null
          status: string
          updated_at: string | null
          user_id: string | null
          vintage_id: string | null
          wine_id: string | null
          wine_name: string
          year: number | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          enrichment_data?: Json | null
          error_message?: string | null
          existing_varietals?: string[] | null
          id?: string
          priority?: number | null
          processed_at?: string | null
          producer_name: string
          region?: string | null
          retry_count?: number | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
          vintage_id?: string | null
          wine_id?: string | null
          wine_name: string
          year?: number | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          enrichment_data?: Json | null
          error_message?: string | null
          existing_varietals?: string[] | null
          id?: string
          priority?: number | null
          processed_at?: string | null
          producer_name?: string
          region?: string | null
          retry_count?: number | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
          vintage_id?: string | null
          wine_id?: string | null
          wine_name?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wines_enrichment_queue_vintage_id_fkey"
            columns: ["vintage_id"]
            isOneToOne: true
            referencedRelation: "vintages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wines_enrichment_queue_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      embedding_stats: {
        Row: {
          avg_vector_similarity: number | null
          completed_jobs: number | null
          estimated_savings_usd: number | null
          failed_jobs: number | null
          openai_vision_matches: number | null
          pending_jobs: number | null
          processing_jobs: number | null
          total_identity_embeddings: number | null
          total_label_embeddings: number | null
          total_wines: number | null
          vector_identity_matches: number | null
          vector_label_matches: number | null
          vectorized_wines: number | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      user_profile_stats: {
        Row: {
          average_rating: number | null
          favorites: number | null
          last_tasting_date: string | null
          total_tastings: number | null
          unique_countries: number | null
          unique_producers: number | null
          unique_regions: number | null
          unique_wines: number | null
          user_id: string | null
          wines_with_notes: number | null
        }
        Relationships: []
      }
      user_profile_stats_materialized: {
        Row: {
          average_rating: number | null
          favorites: number | null
          last_tasting_date: string | null
          total_tastings: number | null
          unique_countries: number | null
          unique_producers: number | null
          unique_regions: number | null
          unique_wines: number | null
          user_id: string | null
          wines_with_notes: number | null
        }
        Relationships: []
      }
      user_wine_stats: {
        Row: {
          average_rating: number | null
          favorites: number | null
          first_tasting_date: string | null
          fortified_wines: number | null
          last_tasting_date: string | null
          last_updated: string | null
          red_wines: number | null
          rose_wines: number | null
          sparkling_wines: number | null
          tastings_last_30_days: number | null
          tastings_last_year: number | null
          tastings_with_location: number | null
          total_tastings: number | null
          unique_countries: number | null
          unique_producers: number | null
          unique_regions: number | null
          unique_tasting_locations: number | null
          unique_wines: number | null
          user_id: string | null
          white_wines: number | null
        }
        Relationships: []
      }
      user_wine_stats_materialized: {
        Row: {
          average_rating: number | null
          favorites: number | null
          first_tasting_date: string | null
          fortified_wines: number | null
          last_tasting_date: string | null
          last_updated: string | null
          red_wines: number | null
          rose_wines: number | null
          sparkling_wines: number | null
          tastings_last_30_days: number | null
          tastings_last_year: number | null
          tastings_with_location: number | null
          total_tastings: number | null
          unique_countries: number | null
          unique_producers: number | null
          unique_regions: number | null
          unique_tasting_locations: number | null
          unique_wines: number | null
          user_id: string | null
          white_wines: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_embedding_jobs: {
        Args: { p_job_type: string; p_limit?: number }
        Returns: {
          id: string
          input_image_url: string
          input_text: string
          job_type: string
          retry_count: number
          scan_id: string
          vintage_id: string
          wine_id: string
        }[]
      }
      claim_enrichment_jobs: {
        Args: { p_limit?: number }
        Returns: {
          country: string
          existing_varietals: string[]
          id: string
          producer_name: string
          region: string
          user_id: string
          vintage_id: string
          wine_id: string
          wine_name: string
          year: number
        }[]
      }
      claim_wines_added_jobs: {
        Args: { p_limit: number }
        Returns: {
          id: string
          idempotency_key: string
          image_url: string
          ocr_text: string
          processed_data: Json
          retry_count: number
          scan_id: string
          status: string
          user_id: string
        }[]
      }
      claim_wines_added_queue_jobs: {
        Args: { p_limit?: number }
        Returns: {
          id: string
          idempotency_key: string
          image_url: string
          ocr_text: string
          retry_count: number
          scan_id: string
          user_id: string
        }[]
      }
      generate_invite_code: { Args: never; Returns: string }
      generate_tasting_search_text: {
        Args: { tasting_id: string }
        Returns: string
      }
      generate_wine_identity_text: {
        Args: { p_wine_id: string }
        Returns: string
      }
      get_invite_by_code: { Args: { code: string }; Returns: Json }
      get_or_create_vintage_for_wine: {
        Args: { p_wine_id: string; p_year?: number }
        Returns: string
      }
      get_sharing_connections_with_profiles: {
        Args: never
        Returns: {
          accepted_at: string
          created_at: string
          id: string
          sharer_id: string
          sharer_profile: Json
          status: string
          updated_at: string
          viewer_id: string
          viewer_profile: Json
        }[]
      }
      get_tastings_with_sharing: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          detailed_notes: string
          id: string
          image_url: string
          is_shared: boolean
          location_address: string
          location_city: string
          location_latitude: number
          location_longitude: number
          location_name: string
          notes: string
          sharer_first_name: string
          sharer_id: string
          sharer_last_name: string
          tasted_at: string
          updated_at: string
          user_id: string
          verdict: number
          vintage_id: string
        }[]
      }
      invoke_generate_embeddings: {
        Args: { p_job_type?: string; p_limit?: number }
        Returns: number
      }
      invoke_wine_processor: { Args: never; Returns: undefined }
      match_wine_by_identity: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          data_completeness: number
          producer_name: string
          similarity: number
          wine_id: string
          wine_name: string
        }[]
      }
      match_wine_by_label: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          producer_name: string
          similarity: number
          vintage_id: string
          vintage_year: number
          wine_id: string
          wine_name: string
        }[]
      }
      match_wine_hybrid: {
        Args: {
          p_identity_embedding?: string
          p_identity_weight?: number
          p_label_embedding?: string
          p_label_weight?: number
          p_match_count?: number
          p_match_threshold?: number
        }
        Returns: {
          combined_score: number
          identity_similarity: number
          label_similarity: number
          match_source: string
          producer_name: string
          vintage_id: string
          wine_id: string
          wine_name: string
        }[]
      }
      refresh_user_profile_stats: { Args: never; Returns: undefined }
      refresh_user_wine_stats: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      search_tastings_text: {
        Args: { match_count?: number; query: string; user_id_filter?: string }
        Returns: {
          image_url: string
          location_name: string
          notes: string
          producer_name: string
          tasting_id: string
          verdict: number
          vintage_year: number
          wine_name: string
        }[]
      }
      search_tastings_vector: {
        Args: {
          match_count?: number
          query_embedding: string
          user_id_filter?: string
        }
        Returns: {
          image_url: string
          location_name: string
          notes: string
          producer_name: string
          similarity: number
          tasting_id: string
          verdict: number
          vintage_year: number
          wine_name: string
        }[]
      }
      update_user_producer_stats: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      update_user_region_stats: {
        Args: { p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
