-- =============================================
-- OCTORATE INTEGRATION SCHEMA (OTA PERSPECTIVE)
-- Migration: 53_octorate_integration_schema.sql
-- =============================================

-- 1. Octorate hotel connections table (OTA perspective)
CREATE TABLE IF NOT EXISTS octorate_hotel_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  
  -- OAuth credentials (encrypted) - Each hotel has their own tokens
  access_token TEXT NOT NULL, -- Encrypted
  refresh_token TEXT NOT NULL, -- Encrypted
  token_expires_at TIMESTAMPTZ,
  
  -- Octorate accommodation ID (hotel's property in Octorate)
  octorate_accommodation_id TEXT NOT NULL,
  
  -- Sync settings
  auto_sync_availability BOOLEAN DEFAULT true, -- Pull availability via webhooks
  auto_sync_rates BOOLEAN DEFAULT true, -- Pull rates via webhooks
  sync_interval_minutes INTEGER DEFAULT 60, -- Fallback polling interval
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_connected BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_inventory_sync_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(hotel_id)
);

-- 2. Room mappings (Map Octorate rooms TO our local rooms)
CREATE TABLE IF NOT EXISTS octorate_room_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  octorate_connection_id UUID NOT NULL REFERENCES octorate_hotel_connections(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  octorate_room_id TEXT NOT NULL, -- Octorate room type ID
  
  -- Mapping metadata
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'failed')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(octorate_connection_id, room_id),
  UNIQUE(octorate_connection_id, octorate_room_id)
);

-- 3. Sync queue (For pulling data FROM Octorate and pushing bookings TO Octorate)
CREATE TABLE IF NOT EXISTS octorate_sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  octorate_connection_id UUID NOT NULL REFERENCES octorate_hotel_connections(id) ON DELETE CASCADE,
  
  sync_type TEXT NOT NULL CHECK (sync_type IN (
    'pull_inventory',      -- Pull rooms FROM Octorate
    'pull_availability',   -- Pull availability FROM Octorate
    'pull_rates',          -- Pull rates FROM Octorate
    'push_booking',        -- PUSH booking TO Octorate
    'check_booking_status' -- Check booking status in Octorate
  )),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  
  entity_type TEXT, -- 'room', 'pricing', 'availability', 'reservation'
  entity_id UUID, -- Local entity ID (for push_booking)
  
  payload JSONB, -- Data to sync (for push) or received data (for pull)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Webhook events log (Incoming events FROM Octorate)
CREATE TABLE IF NOT EXISTS octorate_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  octorate_connection_id UUID NOT NULL REFERENCES octorate_hotel_connections(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL, -- 'PORTAL_SUBSCRIPTION_CALENDAR', 'booking_confirmation', etc.
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 5. Modify hotels table
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS pms_type TEXT DEFAULT 'internal' 
  CHECK (pms_type IN ('internal', 'octorate'));
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS octorate_connection_id UUID REFERENCES octorate_hotel_connections(id);

-- 6. Modify reservations table (for pushing bookings TO Octorate)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS octorate_booking_id TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS pushed_to_octorate_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS octorate_push_status TEXT DEFAULT 'pending' 
  CHECK (octorate_push_status IN ('pending', 'pushed', 'confirmed', 'failed', 'skipped'));
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS octorate_confirmation_received_at TIMESTAMPTZ;

-- 7. Modify rooms table (for synced data FROM Octorate)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS octorate_room_id TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_synced_from_octorate BOOLEAN DEFAULT false;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS last_synced_from_octorate_at TIMESTAMPTZ;

-- 8. Modify room_pricing table (for synced rates FROM Octorate)
ALTER TABLE room_pricing ADD COLUMN IF NOT EXISTS is_synced_from_octorate BOOLEAN DEFAULT false;
ALTER TABLE room_pricing ADD COLUMN IF NOT EXISTS last_synced_from_octorate_at TIMESTAMPTZ;

-- 9. Modify room_availability table (for synced availability FROM Octorate)
ALTER TABLE room_availability ADD COLUMN IF NOT EXISTS is_synced_from_octorate BOOLEAN DEFAULT false;
ALTER TABLE room_availability ADD COLUMN IF NOT EXISTS last_synced_from_octorate_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_octorate_connections_hotel_id ON octorate_hotel_connections(hotel_id);
CREATE INDEX IF NOT EXISTS idx_octorate_connections_business_id ON octorate_hotel_connections(business_id);
CREATE INDEX IF NOT EXISTS idx_octorate_room_mappings_room_id ON octorate_room_mappings(room_id);
CREATE INDEX IF NOT EXISTS idx_octorate_room_mappings_connection_id ON octorate_room_mappings(octorate_connection_id);
CREATE INDEX IF NOT EXISTS idx_octorate_sync_queue_status ON octorate_sync_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_octorate_sync_queue_connection_id ON octorate_sync_queue(octorate_connection_id);
CREATE INDEX IF NOT EXISTS idx_octorate_sync_queue_direction ON octorate_sync_queue(direction);
CREATE INDEX IF NOT EXISTS idx_octorate_webhook_events_processed ON octorate_webhook_events(processed, created_at);
CREATE INDEX IF NOT EXISTS idx_reservations_octorate_booking_id ON reservations(octorate_booking_id);
CREATE INDEX IF NOT EXISTS idx_reservations_octorate_push_status ON reservations(octorate_push_status);
CREATE INDEX IF NOT EXISTS idx_rooms_synced_from_octorate ON rooms(is_synced_from_octorate) WHERE is_synced_from_octorate = true;

-- RLS Policies for Octorate tables
ALTER TABLE octorate_hotel_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hotel owners can manage their Octorate connections"
ON octorate_hotel_connections
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM hotels h
    JOIN businesses b ON h.business_id = b.id
    WHERE h.id = octorate_hotel_connections.hotel_id
    AND b.owner_id = auth.uid()
  )
);

ALTER TABLE octorate_room_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hotel owners can view their Octorate room mappings"
ON octorate_room_mappings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM octorate_hotel_connections ohc
    JOIN hotels h ON ohc.hotel_id = h.id
    JOIN businesses b ON h.business_id = b.id
    WHERE ohc.id = octorate_room_mappings.octorate_connection_id
    AND b.owner_id = auth.uid()
  )
);

ALTER TABLE octorate_sync_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hotel owners can view their sync queue"
ON octorate_sync_queue
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM octorate_hotel_connections ohc
    JOIN hotels h ON ohc.hotel_id = h.id
    JOIN businesses b ON h.business_id = b.id
    WHERE ohc.id = octorate_sync_queue.octorate_connection_id
    AND b.owner_id = auth.uid()
  )
);

ALTER TABLE octorate_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hotel owners can view their webhook events"
ON octorate_webhook_events
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM octorate_hotel_connections ohc
    JOIN hotels h ON ohc.hotel_id = h.id
    JOIN businesses b ON h.business_id = b.id
    WHERE ohc.id = octorate_webhook_events.octorate_connection_id
    AND b.owner_id = auth.uid()
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_octorate_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_octorate_connections_updated_at
  BEFORE UPDATE ON octorate_hotel_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_octorate_updated_at();

CREATE TRIGGER update_octorate_room_mappings_updated_at
  BEFORE UPDATE ON octorate_room_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_octorate_updated_at();

