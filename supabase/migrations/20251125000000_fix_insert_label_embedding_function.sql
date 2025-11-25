-- Fix insert_label_embedding function - remove reference to non-existent updated_at column
CREATE OR REPLACE FUNCTION public.insert_label_embedding(
  p_wine_id uuid,
  p_vintage_id uuid,
  p_source_image_url text,
  p_label_embedding vector,
  p_embedding_model text,
  p_embedding_version integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO label_embeddings (
    wine_id, vintage_id, source_image_url, label_embedding, embedding_model, embedding_version
  ) VALUES (
    p_wine_id, p_vintage_id, p_source_image_url, p_label_embedding, p_embedding_model, p_embedding_version
  )
  ON CONFLICT (wine_id, embedding_model, embedding_version)
  DO UPDATE SET
    label_embedding = EXCLUDED.label_embedding,
    source_image_url = EXCLUDED.source_image_url,
    vintage_id = EXCLUDED.vintage_id;
END;
$function$;
