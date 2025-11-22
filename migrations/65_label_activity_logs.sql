-- =============================================
-- LABEL ACTIVITY LOGS AND TRACKING
-- Migration: 65_label_activity_logs.sql
-- =============================================
-- 
-- Creates audit logging and tracking for label system
-- =============================================

-- =============================================
-- 1. LABEL ACTIVITY LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS label_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'category_created',
    'category_updated',
    'category_deleted',
    'label_created',
    'label_updated',
    'label_deleted',
    'label_assigned_to_business',
    'label_removed_from_business',
    'label_bulk_assigned',
    'label_bulk_removed'
  )),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('category', 'label', 'business_label')),
  entity_id UUID, -- ID of the category, label, or business_label
  related_entity_id UUID, -- Related entity (e.g., business_id when assigning label)
  omd_id UUID REFERENCES omds(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role TEXT, -- 'omd_admin', 'super_admin', 'business_owner'
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE, -- If action is on a business
  label_id UUID REFERENCES labels(id) ON DELETE SET NULL, -- If action involves a label
  category_id UUID REFERENCES label_categories(id) ON DELETE SET NULL, -- If action involves a category
  old_values JSONB, -- Previous values for updates
  new_values JSONB, -- New values for creates/updates
  metadata JSONB, -- Additional context (e.g., bulk operation details)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_label_activity_logs_action_type ON label_activity_logs(action_type);
CREATE INDEX idx_label_activity_logs_entity_type ON label_activity_logs(entity_type);
CREATE INDEX idx_label_activity_logs_entity_id ON label_activity_logs(entity_id);
CREATE INDEX idx_label_activity_logs_omd_id ON label_activity_logs(omd_id);
CREATE INDEX idx_label_activity_logs_user_id ON label_activity_logs(user_id);
CREATE INDEX idx_label_activity_logs_business_id ON label_activity_logs(business_id);
CREATE INDEX idx_label_activity_logs_label_id ON label_activity_logs(label_id);
CREATE INDEX idx_label_activity_logs_category_id ON label_activity_logs(category_id);
CREATE INDEX idx_label_activity_logs_created_at ON label_activity_logs(created_at DESC);

-- =============================================
-- 2. LABEL USAGE STATISTICS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS label_usage_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  omd_id UUID NOT NULL REFERENCES omds(id) ON DELETE CASCADE,
  business_count INTEGER DEFAULT 0, -- Number of businesses using this label
  assignment_count INTEGER DEFAULT 0, -- Total number of times assigned (including re-assignments)
  removal_count INTEGER DEFAULT 0, -- Total number of times removed
  last_assigned_at TIMESTAMPTZ, -- Last time label was assigned to a business
  last_removed_at TIMESTAMPTZ, -- Last time label was removed from a business
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(label_id, omd_id)
);

CREATE INDEX idx_label_usage_stats_label_id ON label_usage_stats(label_id);
CREATE INDEX idx_label_usage_stats_omd_id ON label_usage_stats(omd_id);
CREATE INDEX idx_label_usage_stats_business_count ON label_usage_stats(business_count DESC);
CREATE INDEX idx_label_usage_stats_last_assigned_at ON label_usage_stats(last_assigned_at DESC);

-- =============================================
-- 3. CATEGORY USAGE STATISTICS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS category_usage_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES label_categories(id) ON DELETE CASCADE,
  omd_id UUID NOT NULL REFERENCES omds(id) ON DELETE CASCADE,
  label_count INTEGER DEFAULT 0, -- Number of labels in this category
  business_count INTEGER DEFAULT 0, -- Number of businesses with labels from this category
  total_assignments INTEGER DEFAULT 0, -- Total label assignments from this category
  last_activity_at TIMESTAMPTZ, -- Last time a label in this category was assigned/removed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, omd_id)
);

CREATE INDEX idx_category_usage_stats_category_id ON category_usage_stats(category_id);
CREATE INDEX idx_category_usage_stats_omd_id ON category_usage_stats(omd_id);

-- =============================================
-- 4. FUNCTIONS FOR AUTOMATIC STATS UPDATES
-- =============================================

-- Function to update label usage stats when label is assigned
CREATE OR REPLACE FUNCTION update_label_usage_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO label_usage_stats (label_id, omd_id, business_count, assignment_count, last_assigned_at)
  VALUES (NEW.label_id, (SELECT omd_id FROM labels WHERE id = NEW.label_id), 1, 1, NOW())
  ON CONFLICT (label_id, omd_id) DO UPDATE
  SET
    business_count = (
      SELECT COUNT(DISTINCT business_id)
      FROM business_labels
      WHERE label_id = NEW.label_id
    ),
    assignment_count = label_usage_stats.assignment_count + 1,
    last_assigned_at = NOW(),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update label usage stats when label is removed
CREATE OR REPLACE FUNCTION update_label_usage_on_removal()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE label_usage_stats
  SET
    business_count = (
      SELECT COUNT(DISTINCT business_id)
      FROM business_labels
      WHERE label_id = OLD.label_id
    ),
    removal_count = removal_count + 1,
    last_removed_at = NOW(),
    updated_at = NOW()
  WHERE label_id = OLD.label_id
    AND omd_id = (SELECT omd_id FROM labels WHERE id = OLD.label_id);
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update category stats when label count changes
CREATE OR REPLACE FUNCTION update_category_stats_on_label_change()
RETURNS TRIGGER AS $$
DECLARE
  cat_id UUID;
  omd_id_val UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    cat_id := NEW.category_id;
    omd_id_val := NEW.omd_id;
  ELSIF TG_OP = 'UPDATE' THEN
    cat_id := NEW.category_id;
    omd_id_val := NEW.omd_id;
  ELSIF TG_OP = 'DELETE' THEN
    cat_id := OLD.category_id;
    omd_id_val := OLD.omd_id;
  END IF;

  INSERT INTO category_usage_stats (category_id, omd_id, label_count)
  VALUES (
    cat_id,
    omd_id_val,
    (SELECT COUNT(*) FROM labels WHERE category_id = cat_id AND is_active = true)
  )
  ON CONFLICT (category_id, omd_id) DO UPDATE
  SET
    label_count = (SELECT COUNT(*) FROM labels WHERE category_id = cat_id AND is_active = true),
    updated_at = NOW();
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- 5. TRIGGERS FOR AUTOMATIC STATS UPDATES
-- =============================================

-- Trigger on business_labels insert
CREATE TRIGGER update_label_stats_on_assignment
  AFTER INSERT ON business_labels
  FOR EACH ROW
  EXECUTE FUNCTION update_label_usage_on_assignment();

-- Trigger on business_labels delete
CREATE TRIGGER update_label_stats_on_removal
  AFTER DELETE ON business_labels
  FOR EACH ROW
  EXECUTE FUNCTION update_label_usage_on_removal();

-- Trigger on labels insert/update/delete
CREATE TRIGGER update_category_stats_on_label_change
  AFTER INSERT OR UPDATE OR DELETE ON labels
  FOR EACH ROW
  EXECUTE FUNCTION update_category_stats_on_label_change();

-- =============================================
-- 6. FUNCTION TO LOG LABEL ACTIVITY
-- =============================================

CREATE OR REPLACE FUNCTION log_label_activity(
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_related_entity_id UUID DEFAULT NULL,
  p_omd_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_user_role TEXT DEFAULT NULL,
  p_business_id UUID DEFAULT NULL,
  p_label_id UUID DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO label_activity_logs (
    action_type,
    entity_type,
    entity_id,
    related_entity_id,
    omd_id,
    user_id,
    user_role,
    business_id,
    label_id,
    category_id,
    old_values,
    new_values,
    metadata
  )
  VALUES (
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_related_entity_id,
    p_omd_id,
    p_user_id,
    p_user_role,
    p_business_id,
    p_label_id,
    p_category_id,
    p_old_values,
    p_new_values,
    p_metadata
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- 7. RLS POLICIES FOR ACTIVITY LOGS
-- =============================================

-- Enable RLS
ALTER TABLE label_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE label_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_usage_stats ENABLE ROW LEVEL SECURITY;

-- OMD admins can see logs for their OMD
CREATE POLICY "OMD admins can view their OMD's activity logs"
  ON label_activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('omd_admin', 'super_admin')
        AND (
          user_profiles.role = 'super_admin'
          OR label_activity_logs.omd_id = user_profiles.omd_id
        )
    )
  );

-- Business owners can see logs for their businesses
CREATE POLICY "Business owners can view their business activity logs"
  ON label_activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = label_activity_logs.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

-- OMD admins can view usage stats for their OMD
CREATE POLICY "OMD admins can view their OMD's usage stats"
  ON label_usage_stats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('omd_admin', 'super_admin')
        AND (
          user_profiles.role = 'super_admin'
          OR label_usage_stats.omd_id = user_profiles.omd_id
        )
    )
  );

CREATE POLICY "OMD admins can view their OMD's category stats"
  ON category_usage_stats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('omd_admin', 'super_admin')
        AND (
          user_profiles.role = 'super_admin'
          OR category_usage_stats.omd_id = user_profiles.omd_id
        )
    )
  );

-- =============================================
-- 8. INITIALIZE STATS FOR EXISTING DATA
-- =============================================

-- Initialize label usage stats for existing labels
INSERT INTO label_usage_stats (label_id, omd_id, business_count, assignment_count)
SELECT 
  l.id,
  l.omd_id,
  COUNT(DISTINCT bl.business_id) as business_count,
  COUNT(bl.id) as assignment_count
FROM labels l
LEFT JOIN business_labels bl ON bl.label_id = l.id
GROUP BY l.id, l.omd_id
ON CONFLICT (label_id, omd_id) DO NOTHING;

-- Initialize category usage stats for existing categories
INSERT INTO category_usage_stats (category_id, omd_id, label_count)
SELECT 
  lc.id,
  lc.omd_id,
  COUNT(l.id) as label_count
FROM label_categories lc
LEFT JOIN labels l ON l.category_id = lc.id AND l.is_active = true
GROUP BY lc.id, lc.omd_id
ON CONFLICT (category_id, omd_id) DO NOTHING;

