-- ============================================================
-- FYP RECOMMENDATION SYSTEM — Schema Extensions & RPC Functions
-- Migration: 20260211_fyp_recommendation_system
-- 
-- All changes are ADDITIVE. No existing tables are modified
-- destructively. Safe for zero-downtime deployment.
-- ============================================================

-- ============================================================
-- 1. SCORING COLUMNS ON EXISTING Posts TABLE
-- ============================================================
ALTER TABLE social_media_schema."Posts"
  ADD COLUMN IF NOT EXISTS trending_score FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_score FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_posts_trending
  ON social_media_schema."Posts" (trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_engagement
  ON social_media_schema."Posts" (engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_hashtags
  ON social_media_schema."Posts" USING GIN (hashtags);
CREATE INDEX IF NOT EXISTS idx_posts_created_user
  ON social_media_schema."Posts" (created_at DESC, user_id);

-- ============================================================
-- 2. HASHTAG / TOPIC SYSTEM
-- ============================================================
CREATE TABLE IF NOT EXISTS social_media_schema."Topics" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT DEFAULT 'general',
  post_count INT DEFAULT 0,
  trending_boost FLOAT DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_media_schema."Post_topics" (
  post_id UUID REFERENCES social_media_schema."Posts"(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES social_media_schema."Topics"(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_post_topics_topic
  ON social_media_schema."Post_topics" (topic_id);

-- ============================================================
-- 3. ENHANCED INTERACTION LOGGING
-- ============================================================
CREATE TABLE IF NOT EXISTS social_media_schema."Interaction_events" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES social_media_schema."Posts"(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  duration_ms INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interaction_events_user
  ON social_media_schema."Interaction_events" (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interaction_events_post
  ON social_media_schema."Interaction_events" (post_id, event_type);
CREATE INDEX IF NOT EXISTS idx_interaction_events_type_time
  ON social_media_schema."Interaction_events" (event_type, created_at DESC);

-- ============================================================
-- 4. USER INTEREST PROFILE / AFFINITY VECTOR
-- ============================================================
CREATE TABLE IF NOT EXISTS social_media_schema."User_interests" (
  user_id UUID NOT NULL,
  topic_id UUID NOT NULL REFERENCES social_media_schema."Topics"(id) ON DELETE CASCADE,
  affinity_score FLOAT DEFAULT 0,
  interaction_count INT DEFAULT 0,
  last_interaction_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_user_interests_user
  ON social_media_schema."User_interests" (user_id, affinity_score DESC);

-- ============================================================
-- 5. USER CREATOR AFFINITY
-- ============================================================
CREATE TABLE IF NOT EXISTS social_media_schema."User_creator_affinity" (
  user_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  affinity_score FLOAT DEFAULT 0,
  interaction_count INT DEFAULT 0,
  last_interaction_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_affinity_user
  ON social_media_schema."User_creator_affinity" (user_id, affinity_score DESC);

-- ============================================================
-- 6. FYP CONFIGURATION (TUNABLE WEIGHTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS social_media_schema."Fyp_config" (
  key TEXT PRIMARY KEY,
  value FLOAT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO social_media_schema."Fyp_config" (key, value, description) VALUES
  ('weight_view',             1.0,  'Base weight for a view event'),
  ('weight_dwell',            2.0,  'Weight for dwell time (per second)'),
  ('weight_like',             5.0,  'Weight for a like'),
  ('weight_comment',          8.0,  'Weight for a comment'),
  ('weight_save',             7.0,  'Weight for a save/bookmark'),
  ('weight_share',            6.0,  'Weight for a share'),
  ('weight_follow',          10.0,  'Weight for following the creator'),
  ('weight_skip',            -2.0,  'Negative weight for skip/scroll-past'),
  ('weight_report',         -20.0,  'Strong negative for report'),
  ('decay_half_life_hours',  48.0,  'Time decay half-life in hours'),
  ('exploration_ratio',       0.15, 'Fraction of feed slots for exploration'),
  ('max_same_creator',        3.0,  'Max posts from same creator in one feed page'),
  ('follow_boost',            2.0,  'Multiplier for posts from followed creators'),
  ('trending_blend',          0.2,  'Fraction of feed blended from trending')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 7. FEED CACHE (Phase 3+)
-- ============================================================
CREATE TABLE IF NOT EXISTS social_media_schema."Feed_cache" (
  user_id UUID NOT NULL,
  post_id UUID NOT NULL,
  score FLOAT NOT NULL,
  position INT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_cache_user_score
  ON social_media_schema."Feed_cache" (user_id, score DESC);

-- ============================================================
-- 8. HELPER: Log an interaction event (called from frontend)
-- ============================================================
CREATE OR REPLACE FUNCTION social_media_schema.log_interaction_event(
  p_user_id UUID,
  p_post_id UUID,
  p_event_type TEXT,
  p_duration_ms INT DEFAULT 0,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO social_media_schema."Interaction_events"
    (user_id, post_id, event_type, duration_ms, metadata)
  VALUES
    (p_user_id, p_post_id, p_event_type, p_duration_ms, p_metadata);
END;
$$;

-- ============================================================
-- 9. HELPER: Extract and store hashtags on post creation
-- ============================================================
CREATE OR REPLACE FUNCTION social_media_schema.extract_post_hashtags()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_tags TEXT[];
  v_tag TEXT;
  v_topic_id UUID;
BEGIN
  -- Extract hashtags from caption using regex
  IF NEW.caption IS NOT NULL THEN
    SELECT ARRAY(
      SELECT LOWER(m[1])
      FROM regexp_matches(NEW.caption, '#(\w+)', 'g') AS m
    ) INTO v_tags;

    NEW.hashtags := COALESCE(v_tags, '{}');

    -- Upsert each hashtag into Topics and link via Post_topics
    IF v_tags IS NOT NULL THEN
      FOREACH v_tag IN ARRAY v_tags LOOP
        -- Upsert topic
        INSERT INTO social_media_schema."Topics" (name, post_count)
        VALUES (v_tag, 1)
        ON CONFLICT (name) DO UPDATE SET
          post_count = social_media_schema."Topics".post_count + 1
        RETURNING id INTO v_topic_id;

        -- Link post to topic
        INSERT INTO social_media_schema."Post_topics" (post_id, topic_id)
        VALUES (NEW.id, v_topic_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger (BEFORE INSERT so NEW.hashtags is set on the row)
DROP TRIGGER IF EXISTS trg_extract_hashtags ON social_media_schema."Posts";
CREATE TRIGGER trg_extract_hashtags
  BEFORE INSERT ON social_media_schema."Posts"
  FOR EACH ROW
  EXECUTE FUNCTION social_media_schema.extract_post_hashtags();

-- ============================================================
-- 10. CANDIDATE GENERATION FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION social_media_schema.get_fyp_candidates(
  p_user_id UUID,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  post_id UUID,
  source TEXT,
  source_score FLOAT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_follow_boost FLOAT;
  v_trending_blend FLOAT;
  v_exploration_ratio FLOAT;
  v_follow_limit INT;
  v_trending_limit INT;
  v_explore_limit INT;
  v_topic_limit INT;
  v_creator_limit INT;
BEGIN
  -- Load config with defaults
  SELECT COALESCE(value, 2.0) INTO v_follow_boost
    FROM social_media_schema."Fyp_config" WHERE key = 'follow_boost';
  SELECT COALESCE(value, 0.2) INTO v_trending_blend
    FROM social_media_schema."Fyp_config" WHERE key = 'trending_blend';
  SELECT COALESCE(value, 0.15) INTO v_exploration_ratio
    FROM social_media_schema."Fyp_config" WHERE key = 'exploration_ratio';

  -- Fallback if config table is empty
  v_follow_boost := COALESCE(v_follow_boost, 2.0);
  v_trending_blend := COALESCE(v_trending_blend, 0.2);
  v_exploration_ratio := COALESCE(v_exploration_ratio, 0.15);

  -- Budget allocation
  v_follow_limit    := GREATEST(1, (p_limit * 0.30)::INT);
  v_trending_limit  := GREATEST(1, (p_limit * v_trending_blend)::INT);
  v_explore_limit   := GREATEST(1, (p_limit * v_exploration_ratio)::INT);
  v_topic_limit     := GREATEST(1, (p_limit * 0.20)::INT);
  v_creator_limit   := GREATEST(1, (p_limit * 0.15)::INT);

  RETURN QUERY

  -- SOURCE 1: Follow graph
  (
    SELECT p.id, 'follow'::TEXT, v_follow_boost
    FROM social_media_schema."Posts" p
    JOIN social_media_schema."follows" f ON f.following_id = p.user_id
    WHERE f.follower_id = p_user_id
      AND p.id NOT IN (
        SELECT bp.post_id FROM social_media_schema."Block_posts" bp
        WHERE bp.user_id = p_user_id
      )
      AND p.id NOT IN (
        SELECT pi.post_id FROM social_media_schema."post_interactions" pi
        WHERE pi.user_id = p_user_id AND pi.interaction_type = 'like'
      )
      AND p.id NOT IN (
        SELECT ie.post_id FROM social_media_schema."Interaction_events" ie
        WHERE ie.user_id = p_user_id AND ie.event_type = 'view'
      )
    ORDER BY p.created_at DESC
    LIMIT v_follow_limit
  )

  UNION ALL

  -- SOURCE 2: Topic match
  (
    SELECT p.id, 'topic'::TEXT, ui.affinity_score
    FROM social_media_schema."Posts" p
    JOIN social_media_schema."Post_topics" pt ON pt.post_id = p.id
    JOIN social_media_schema."User_interests" ui ON ui.topic_id = pt.topic_id
    WHERE ui.user_id = p_user_id
      AND p.user_id != p_user_id
      AND p.id NOT IN (
        SELECT bp.post_id FROM social_media_schema."Block_posts" bp
        WHERE bp.user_id = p_user_id
      )
      AND p.id NOT IN (
        SELECT pi.post_id FROM social_media_schema."post_interactions" pi
        WHERE pi.user_id = p_user_id AND pi.interaction_type = 'like'
      )
      AND p.id NOT IN (
        SELECT ie.post_id FROM social_media_schema."Interaction_events" ie
        WHERE ie.user_id = p_user_id AND ie.event_type = 'view'
      )
    ORDER BY ui.affinity_score DESC, p.created_at DESC
    LIMIT v_topic_limit
  )

  UNION ALL

  -- SOURCE 3: Creator affinity
  (
    SELECT p.id, 'creator'::TEXT, ca.affinity_score
    FROM social_media_schema."Posts" p
    JOIN social_media_schema."User_creator_affinity" ca ON ca.creator_id = p.user_id
    WHERE ca.user_id = p_user_id
      AND ca.affinity_score > 0
      AND p.id NOT IN (
        SELECT bp.post_id FROM social_media_schema."Block_posts" bp
        WHERE bp.user_id = p_user_id
      )
      AND p.id NOT IN (
        SELECT pi.post_id FROM social_media_schema."post_interactions" pi
        WHERE pi.user_id = p_user_id AND pi.interaction_type = 'like'
      )
      AND p.id NOT IN (
        SELECT ie.post_id FROM social_media_schema."Interaction_events" ie
        WHERE ie.user_id = p_user_id AND ie.event_type = 'view'
      )
    ORDER BY ca.affinity_score DESC, p.created_at DESC
    LIMIT v_creator_limit
  )

  UNION ALL

  -- SOURCE 4: Trending
  (
    SELECT p.id, 'trending'::TEXT, p.trending_score
    FROM social_media_schema."Posts" p
    WHERE p.created_at > now() - INTERVAL '7 days'
      AND p.id NOT IN (
        SELECT bp.post_id FROM social_media_schema."Block_posts" bp
        WHERE bp.user_id = p_user_id
      )
      AND p.id NOT IN (
        SELECT pi.post_id FROM social_media_schema."post_interactions" pi
        WHERE pi.user_id = p_user_id AND pi.interaction_type = 'like'
      )
      AND p.id NOT IN (
        SELECT ie.post_id FROM social_media_schema."Interaction_events" ie
        WHERE ie.user_id = p_user_id AND ie.event_type = 'view'
      )
    ORDER BY p.trending_score DESC
    LIMIT v_trending_limit
  )

  UNION ALL

  -- SOURCE 5: Exploration (random diverse posts)
  (
    SELECT p.id, 'explore'::TEXT, 0.5
    FROM social_media_schema."Posts" p
    WHERE p.created_at > now() - INTERVAL '30 days'
      AND p.user_id != p_user_id
      AND p.id NOT IN (
        SELECT bp.post_id FROM social_media_schema."Block_posts" bp
        WHERE bp.user_id = p_user_id
      )
      AND p.id NOT IN (
        SELECT pi.post_id FROM social_media_schema."post_interactions" pi
        WHERE pi.user_id = p_user_id AND pi.interaction_type = 'like'
      )
      AND p.id NOT IN (
        SELECT ie.post_id FROM social_media_schema."Interaction_events" ie
        WHERE ie.user_id = p_user_id AND ie.event_type = 'view'
      )
    ORDER BY random()
    LIMIT v_explore_limit
  );
END;
$$;

-- ============================================================
-- 11. MAIN FYP FEED FUNCTION (Ranking Pipeline)
-- ============================================================
CREATE OR REPLACE FUNCTION social_media_schema.get_fyp_feed(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  media_url TEXT,
  caption TEXT,
  type TEXT,
  likes INT,
  shares INT,
  comments_count INT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  fyp_score FLOAT,
  fyp_source TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_decay_half_life FLOAT;
  v_max_same_creator INT;
  v_interaction_count INT;
BEGIN
  -- Load config
  SELECT COALESCE(value, 48.0) INTO v_decay_half_life
    FROM social_media_schema."Fyp_config" WHERE key = 'decay_half_life_hours';
  SELECT COALESCE(value, 3)::INT INTO v_max_same_creator
    FROM social_media_schema."Fyp_config" WHERE key = 'max_same_creator';

  v_decay_half_life := COALESCE(v_decay_half_life, 48.0);
  v_max_same_creator := COALESCE(v_max_same_creator, 3);

  -- Cold start detection
  SELECT COUNT(*) INTO v_interaction_count
    FROM social_media_schema."Interaction_events"
    WHERE social_media_schema."Interaction_events".user_id = p_user_id;

  -- COLD START: Return trending + recent popular posts for new users
  IF v_interaction_count < 5 THEN
    RETURN QUERY
      SELECT
        p.id, p.media_url, p.caption, p.type,
        p.likes, p.shares, p.comments_count, p.created_at,
        p.user_id,
        COALESCE(p.trending_score, 0) + COALESCE(p.engagement_score, 0) AS fyp_score,
        'cold_start'::TEXT AS fyp_source
      FROM social_media_schema."Posts" p
      WHERE p.created_at > now() - INTERVAL '14 days'
        AND p.id NOT IN (
          SELECT bp.post_id FROM social_media_schema."Block_posts" bp
          WHERE bp.user_id = p_user_id
        )
        AND p.id NOT IN (
          SELECT pi.post_id FROM social_media_schema."post_interactions" pi
          WHERE pi.user_id = p_user_id AND pi.interaction_type = 'like'
        )
        AND p.id NOT IN (
          SELECT ie.post_id FROM social_media_schema."Interaction_events" ie
          WHERE ie.user_id = p_user_id AND ie.event_type = 'view'
        )
        AND (p_cursor IS NULL OR p.created_at < p_cursor)
      ORDER BY
        COALESCE(p.trending_score, 0) + COALESCE(p.engagement_score, 0) DESC,
        p.created_at DESC
      LIMIT p_limit;
    RETURN;
  END IF;

  -- PERSONALIZED FEED
  RETURN QUERY
  WITH
  -- Step 1: Get candidates
  candidates AS (
    SELECT DISTINCT ON (c.post_id) c.post_id, c.source, c.source_score
    FROM social_media_schema.get_fyp_candidates(p_user_id, 100) c
  ),

  -- Step 2: Compute scores
  scored AS (
    SELECT
      p.id, p.media_url, p.caption, p.type,
      p.likes, p.shares, p.comments_count, p.created_at,
      p.user_id,
      c.source,
      (
        -- Engagement component (30%)
        COALESCE(p.engagement_score, 0) * 0.3
        -- Source relevance (25%)
        + COALESCE(c.source_score, 0) * 0.25
        -- Creator affinity (20%)
        + COALESCE(
            (SELECT ca.affinity_score FROM social_media_schema."User_creator_affinity" ca
             WHERE ca.user_id = p_user_id AND ca.creator_id = p.user_id),
            0
          ) * 0.20
        -- Freshness decay (15%)
        + POWER(0.5,
            EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600.0
            / GREATEST(v_decay_half_life, 1)
          ) * 0.15
        -- Follow bonus (10%)
        + CASE WHEN EXISTS (
            SELECT 1 FROM social_media_schema."follows" f
            WHERE f.follower_id = p_user_id AND f.following_id = p.user_id
          ) THEN 0.10 ELSE 0 END
      ) AS computed_score
    FROM social_media_schema."Posts" p
    JOIN candidates c ON c.post_id = p.id
    WHERE (p_cursor IS NULL OR p.created_at < p_cursor)
  ),

  -- Step 3: Normalize scores to 0-1
  normalized AS (
    SELECT s.*,
      CASE
        WHEN MAX(s.computed_score) OVER () = MIN(s.computed_score) OVER () THEN 0.5
        ELSE (s.computed_score - MIN(s.computed_score) OVER ())
             / NULLIF(MAX(s.computed_score) OVER () - MIN(s.computed_score) OVER (), 0)
      END AS norm_score
    FROM scored s
  ),

  -- Step 4: Diversity — cap per creator
  diversified AS (
    SELECT n.*,
      ROW_NUMBER() OVER (PARTITION BY n.user_id ORDER BY n.norm_score DESC) AS creator_rank
    FROM normalized n
  )

  -- Step 5: Final selection
  SELECT
    d.id, d.media_url, d.caption, d.type,
    d.likes, d.shares, d.comments_count, d.created_at,
    d.user_id,
    d.norm_score AS fyp_score,
    d.source AS fyp_source
  FROM diversified d
  WHERE d.creator_rank <= v_max_same_creator
  ORDER BY d.norm_score DESC, random() * 0.05
  LIMIT p_limit;
END;
$$;

-- ============================================================
-- 12. BACKGROUND JOB: Update Trending Scores
-- ============================================================
CREATE OR REPLACE FUNCTION social_media_schema.update_trending_scores()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE social_media_schema."Posts" p
  SET
    trending_score = sub.t_score,
    engagement_score = sub.e_score
  FROM (
    SELECT
      p2.id,
      COALESCE((
        SELECT SUM(
          CASE e.event_type
            WHEN 'like' THEN 5.0
            WHEN 'comment' THEN 8.0
            WHEN 'save' THEN 7.0
            WHEN 'share' THEN 6.0
            WHEN 'view' THEN 1.0
            ELSE 0
          END
          * POWER(0.5, EXTRACT(EPOCH FROM (now() - e.created_at)) / 3600.0 / 48.0)
        )
        FROM social_media_schema."Interaction_events" e
        WHERE e.post_id = p2.id
          AND e.created_at > now() - INTERVAL '7 days'
      ), 0) AS t_score,
      (
        COALESCE(p2.likes, 0) * 5.0 +
        COALESCE(p2.comments_count, 0) * 8.0 +
        COALESCE(p2.shares, 0) * 6.0
      ) AS e_score
    FROM social_media_schema."Posts" p2
    WHERE p2.created_at > now() - INTERVAL '30 days'
  ) sub
  WHERE p.id = sub.id;
END;
$$;

-- ============================================================
-- 13. BACKGROUND JOB: Update User Interest Profiles
-- ============================================================
CREATE OR REPLACE FUNCTION social_media_schema.update_user_interests()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO social_media_schema."User_interests"
    (user_id, topic_id, affinity_score, interaction_count, last_interaction_at)
  SELECT
    e.user_id,
    pt.topic_id,
    SUM(
      CASE e.event_type
        WHEN 'like' THEN 5.0
        WHEN 'comment' THEN 8.0
        WHEN 'save' THEN 7.0
        WHEN 'view' THEN 1.0
        WHEN 'skip' THEN -2.0
        ELSE 0
      END
      * POWER(0.5, EXTRACT(EPOCH FROM (now() - e.created_at)) / 3600.0 / 168.0)
    ),
    COUNT(*),
    MAX(e.created_at)
  FROM social_media_schema."Interaction_events" e
  JOIN social_media_schema."Post_topics" pt ON pt.post_id = e.post_id
  WHERE e.created_at > now() - INTERVAL '30 days'
  GROUP BY e.user_id, pt.topic_id
  ON CONFLICT (user_id, topic_id) DO UPDATE SET
    affinity_score = EXCLUDED.affinity_score,
    interaction_count = EXCLUDED.interaction_count,
    last_interaction_at = EXCLUDED.last_interaction_at;
END;
$$;

-- ============================================================
-- 14. BACKGROUND JOB: Update Creator Affinity
-- ============================================================
CREATE OR REPLACE FUNCTION social_media_schema.update_creator_affinity()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO social_media_schema."User_creator_affinity"
    (user_id, creator_id, affinity_score, interaction_count, last_interaction_at)
  SELECT
    e.user_id,
    p.user_id AS creator_id,
    SUM(
      CASE e.event_type
        WHEN 'like' THEN 5.0
        WHEN 'comment' THEN 8.0
        WHEN 'save' THEN 7.0
        WHEN 'follow' THEN 10.0
        WHEN 'view' THEN 1.0
        WHEN 'skip' THEN -2.0
        ELSE 0
      END
      * POWER(0.5, EXTRACT(EPOCH FROM (now() - e.created_at)) / 3600.0 / 168.0)
    ),
    COUNT(*),
    MAX(e.created_at)
  FROM social_media_schema."Interaction_events" e
  JOIN social_media_schema."Posts" p ON p.id = e.post_id
  WHERE e.created_at > now() - INTERVAL '30 days'
    AND e.user_id != p.user_id
  GROUP BY e.user_id, p.user_id
  ON CONFLICT (user_id, creator_id) DO UPDATE SET
    affinity_score = EXCLUDED.affinity_score,
    interaction_count = EXCLUDED.interaction_count,
    last_interaction_at = EXCLUDED.last_interaction_at;
END;
$$;

-- ============================================================
-- 15. AUTO-UPDATE TRIGGER: Increment scores on interaction events
-- ============================================================
CREATE OR REPLACE FUNCTION social_media_schema.on_interaction_event_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Increment views_count on view events
  IF NEW.event_type = 'view' THEN
    UPDATE social_media_schema."Posts"
    SET views_count = views_count + 1
    WHERE id = NEW.post_id;
  END IF;

  -- Update engagement_score (lightweight incremental bump)
  UPDATE social_media_schema."Posts"
  SET engagement_score = engagement_score + (
    CASE NEW.event_type
      WHEN 'like' THEN 5.0
      WHEN 'comment' THEN 8.0
      WHEN 'save' THEN 7.0
      WHEN 'share' THEN 6.0
      WHEN 'view' THEN 1.0
      WHEN 'dwell' THEN 2.0
      WHEN 'follow' THEN 10.0
      WHEN 'skip' THEN -2.0
      WHEN 'report' THEN -20.0
      WHEN 'unlike' THEN -5.0
      WHEN 'unsave' THEN -7.0
      ELSE 0
    END
  )
  WHERE id = NEW.post_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_interaction ON social_media_schema."Interaction_events";
CREATE TRIGGER trg_on_interaction
  AFTER INSERT ON social_media_schema."Interaction_events"
  FOR EACH ROW
  EXECUTE FUNCTION social_media_schema.on_interaction_event_insert();

-- ============================================================
-- 16. ON-DEMAND SCORE REFRESH RPC
-- ============================================================
CREATE OR REPLACE FUNCTION social_media_schema.refresh_fyp_scores(p_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM social_media_schema.update_trending_scores();
  PERFORM social_media_schema.update_user_interests();
  PERFORM social_media_schema.update_creator_affinity();
END;
$$;

-- ============================================================
-- 17. OPTIONAL: Schedule background jobs with pg_cron
--     (Uncomment if pg_cron extension is available)
-- ============================================================
-- SELECT cron.schedule('update-trending', '*/15 * * * *',
--   'SELECT social_media_schema.update_trending_scores()');
-- SELECT cron.schedule('update-interests', '0 * * * *',
--   'SELECT social_media_schema.update_user_interests()');
-- SELECT cron.schedule('update-creator-affinity', '0 * * * *',
--   'SELECT social_media_schema.update_creator_affinity()');