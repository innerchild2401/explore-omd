# 🏨 Individual Room Management System - Implementation Plan

## 📋 **Executive Summary**

This plan outlines the implementation of **individual room-level management** for the OMD platform, moving from room-type-based inventory to **physical room inventory** with precise assignment and tracking.

### **Current State vs. Target State**

| Aspect | Current (Room Types) | Target (Individual Rooms) |
|--------|---------------------|--------------------------|
| **Inventory** | "110 Double rooms" | "Room 201, 202, 203..." (tracked individually) |
| **Booking** | Auto-assign on check-in | Assign specific room at booking |
| **Status** | Quantity-based | Individual room status (clean/dirty/occupied/OOO) |
| **Tracking** | Availability by type | Real-time per-room status |

---

## 🎯 **Business Requirements**

### **1. Room-Level Booking System**
- **Current**: Book by room type (e.g., "Double Room")
- **Target**: Book specific rooms (e.g., "Room 201")
- Assign room at booking creation (or auto-assign from available pool)

### **2. Physical Room Tracking**
- Each physical room has a unique identifier (number, floor, wing)
- Track per-room status:
  - ✅ **Clean** - Ready for guest
  - 🧹 **Dirty** - Needs cleaning
  - 🛌 **Occupied** - Guest checked in
  - 🔧 **Out of Order** - Under maintenance
  - 🚫 **Blocked** - Intentionally blocked

### **3. Optimal Room Allocation**
- **Auto-assignment algorithm** to maximize occupancy
- **Manual override** for special requests
- **Room preference matching** (floor, view, amenity requirements)

### **4. Multi-Tenant Isolation**
- Each hotel's rooms completely isolated
- `hotel_id` foreign key ensures data separation
- Row-Level Security (RLS) policies per hotel

---

## 🏗️ **Database Schema Design**

### **Phase 1: Individual Room Table**

```sql
-- Individual physical rooms
CREATE TABLE individual_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_type_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  
  -- Physical Identification
  room_number TEXT NOT NULL,          -- "201", "1501A", "Suite B"
  floor_number INTEGER,
  wing TEXT,                          -- "North Wing", "Tower"
  building TEXT,                       -- If multi-building property
  
  -- Room Details
  view_type TEXT,                     -- "ocean", "city", "garden", "no_view"
  bed_configuration_specific JSONB,   -- Actual beds in this room
  
  -- Status
  current_status TEXT DEFAULT 'clean' CHECK (current_status IN ('clean', 'dirty', 'occupied', 'out_of_order', 'blocked')),
  
  -- Physical Attributes
  size_sqm INTEGER,                   -- Exact room size
  balcony BOOLEAN DEFAULT false,
  accessible BOOLEAN DEFAULT false,    -- ADA compliance
  
  -- Identification with hotel
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(hotel_id, room_number)       -- Room numbers unique per hotel
);

CREATE INDEX idx_individual_rooms_hotel ON individual_rooms(hotel_id);
CREATE INDEX idx_individual_rooms_type ON individual_rooms(room_type_id);
CREATE INDEX idx_individual_rooms_status ON individual_rooms(current_status);
CREATE INDEX idx_individual_rooms_number ON individual_rooms(hotel_id, room_number);
```

### **Phase 2: Room Status History**

```sql
-- Track room status changes for housekeeping and audit
CREATE TABLE room_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  individual_room_id UUID NOT NULL REFERENCES individual_rooms(id) ON DELETE CASCADE,
  
  -- Status Change
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  
  -- Context
  reservation_id UUID REFERENCES reservations(id),
  notes TEXT,
  
  -- Timestamps
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_room_status_history_room ON room_status_history(individual_room_id);
CREATE INDEX idx_room_status_history_date ON room_status_history(changed_at);
```

### **Phase 3: Reservations with Room Assignment**

```sql
-- Update reservations table to reference individual rooms
ALTER TABLE reservations ADD COLUMN individual_room_id UUID REFERENCES individual_rooms(id);

-- Add room assignment tracking
ALTER TABLE reservations ADD COLUMN room_assigned_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN assignment_method TEXT CHECK (assignment_method IN ('auto', 'manual', 'guest_request'));
```

### **Phase 4: Availability Per Individual Room**

```sql
-- Track availability per individual room (not room type)
CREATE TABLE individual_room_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  individual_room_id UUID NOT NULL REFERENCES individual_rooms(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'reserved', 'maintenance', 'blocked')),
  
  -- Reservation reference
  reservation_id UUID REFERENCES reservations(id),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(individual_room_id, date)
);

CREATE INDEX idx_individual_room_availability_room ON individual_room_availability(individual_room_id);
CREATE INDEX idx_individual_room_availability_date ON individual_room_availability(date);
CREATE INDEX idx_individual_room_availability_status ON individual_room_availability(status);
```

---

## 🧮 **Room Allocation Algorithm**

### **Strategy 1: Auto-Assignment (Default)**
When a booking is created, automatically assign the best available room based on:

1. **Room Type Match** - Must match requested room type
2. **Availability** - No conflicts for check-in to check-out dates
3. **Status** - Must be "clean" or scheduled to be clean before check-in
4. **Preferences** (if provided):
   - Floor preference (high/low)
   - View type
   - Accessibility needs
   - Quiet room (away from elevators/noise)

### **Algorithm Implementation**

```sql
-- Function to auto-assign room for a reservation
CREATE OR REPLACE FUNCTION auto_assign_room_for_reservation(
  p_reservation_id UUID,
  p_room_type_id UUID,
  p_check_in_date DATE,
  p_check_out_date DATE,
  p_preferences JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_room_id UUID;
BEGIN
  -- Find available room matching criteria
  SELECT ir.id INTO v_room_id
  FROM individual_rooms ir
  WHERE ir.room_type_id = p_room_type_id
    AND ir.current_status = 'clean'
    AND ir.hotel_id = (SELECT hotel_id FROM reservations WHERE id = p_reservation_id)
    AND NOT EXISTS (
      SELECT 1 FROM individual_room_availability ira
      WHERE ira.individual_room_id = ir.id
        AND ira.date BETWEEN p_check_in_date AND p_check_out_date - INTERVAL '1 day'
        AND ira.status = 'reserved'
    )
  ORDER BY 
    -- Prioritize by preferences
    CASE 
      WHEN p_preferences->>'floor' = 'high' THEN ir.floor_number DESC
      WHEN p_preferences->>'floor' = 'low' THEN ir.floor_number ASC
      ELSE 0
    END,
    -- Random for equal candidates
    RANDOM()
  LIMIT 1;
  
  -- Update reservation
  UPDATE reservations
  SET individual_room_id = v_room_id,
      room_assigned_at = NOW(),
      assignment_method = 'auto'
  WHERE id = p_reservation_id;
  
  -- Mark availability for dates
  INSERT INTO individual_room_availability (individual_room_id, date, status, reservation_id)
  SELECT v_room_id, date, 'reserved', p_reservation_id
  FROM generate_series(p_check_in_date, p_check_out_date - INTERVAL '1 day', INTERVAL '1 day') AS date;
  
  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql;
```

### **Strategy 2: Manual Override**
- Receptionist can manually override auto-assignment
- Drag-and-drop in availability calendar
- Change room assignment anytime before check-in

---

## 🎨 **UI/UX Design**

### **1. Room Management Dashboard**

**Tab 1: Room List**
- Table view of all individual rooms
- Columns: Room #, Type, Floor, Status, Next Guest, Actions
- Filter by: Status, Type, Floor
- Quick actions: Block Room, Maintenance, View Details

**Tab 2: Visual Floor Plan**
- Interactive floor plan showing room locations
- Color-coded by status
- Click to view/edit room details
- Drag-and-drop for housekeeping updates

**Tab 3: Availability Calendar** (Enhanced)
- Current: Shows room types
- Target: Shows individual rooms
- Compact view (folders by room type)
- Expanded view (all rooms listed)

**Tab 4: Housekeeping**
- To-do list sorted by priority
- Room-specific tasks
- Integration with maintenance schedule

### **2. Booking Flow Enhancement**

**Step 1: Guest Information** (Unchanged)

**Step 2: Room Selection** (Enhanced)
```
┌─────────────────────────────────────┐
│ Select Room Type: [Double ▼]        │
├─────────────────────────────────────┤
│ Room Assignment: ○ Auto  ● Manual   │
├─────────────────────────────────────┤
│ Available Rooms:                    │
│                                     │
│ ✅ 201 - Double - Floor 2           │
│ ✅ 202 - Double - Floor 2           │
│ ✅ 215 - Double - Floor 2 - Ocean View
│ ✅ 219 - Double - Floor 2           │
│ ⚠️  220 - Double - Floor 2 (Cleaning until 15:00)
│                                     │
│ [Show All Available]                │
└─────────────────────────────────────┘
```

**Step 3: Confirmation** (Unchanged)

### **3. Room Number Entry Interface**

**Option A: Sequential Auto-Generation**
- Hotel defines naming convention: "Prefix + Sequential"
- Example: "201", "202", "203" for Double rooms
- Admin clicks "Generate Rooms" → auto-creates all rooms from room type

**Option B: Manual Entry**
- Hotel staff enters each room manually
- More control, more work
- Better for small hotels

**Option C: Import from CSV**
- Bulk upload room list
- Format: room_number, floor, wing, view_type, etc.
- Best for large hotels

---

## 🔐 **Data Isolation & Security**

### **Row-Level Security (RLS) Policies**

```sql
-- Individual rooms: Hotel owners can only see their own rooms
CREATE POLICY "hotel_owners_manage_individual_rooms"
ON individual_rooms FOR ALL
TO authenticated
USING (
  hotel_id IN (
    SELECT h.id FROM hotels h
    JOIN businesses b ON b.id = h.business_id
    WHERE b.owner_id = auth.uid()
  )
);

-- Hotel owners can view availability of their rooms only
CREATE POLICY "hotel_owners_view_availability"
ON individual_room_availability FOR ALL
TO authenticated
USING (
  individual_room_id IN (
    SELECT id FROM individual_rooms ir
    WHERE ir.hotel_id IN (
      SELECT h.id FROM hotels h
      JOIN businesses b ON b.id = h.business_id
      WHERE b.owner_id = auth.uid()
    )
  )
);
```

---

## 📊 **Implementation Phases**

### **Phase 1: Database Schema (Week 1)**
- [ ] Create `individual_rooms` table
- [ ] Create `room_status_history` table
- [ ] Add `individual_room_id` to `reservations`
- [ ] Create `individual_room_availability` table
- [ ] Add indexes and constraints
- [ ] Create RLS policies

### **Phase 2: Room Generation (Week 2)**
- [ ] Build "Generate Rooms" UI component
- [ ] Implement sequential auto-generation
- [ ] Build manual room entry form
- [ ] Build CSV import feature
- [ ] Add bulk room edit capabilities

### **Phase 3: Booking System Updates (Week 3)**
- [ ] Update `NewReservationModal` with room selection
- [ ] Implement auto-assignment algorithm
- [ ] Build manual override UI
- [ ] Update availability checking to use individual rooms
- [ ] Update room inventory triggers

### **Phase 4: Dashboard & Views (Week 4)**
- [ ] Build Room Management tab in HotelDashboard
- [ ] Create room list view with filters
- [ ] Enhance availability calendar for individual rooms
- [ ] Build housekeeping management view
- [ ] Add room detail modal

### **Phase 5: Status Management (Week 5)**
- [ ] Implement room status transitions
- [ ] Build housekeeping workflow
- [ ] Add maintenance scheduling
- [ ] Create status history timeline
- [ ] Update availability based on status changes

### **Phase 6: Testing & Optimization (Week 6)**
- [ ] Load testing with 20k rooms
- [ ] Performance optimization (indexes, queries)
- [ ] User acceptance testing
- [ ] Documentation
- [ ] Migration plan for existing data

---

## 📈 **Expected Outcomes**

### **For Hotels**
- ✅ Real-time visibility of every room
- ✅ Optimized room assignments
- ✅ Better housekeeping coordination
- ✅ Easier maintenance planning
- ✅ Improved guest satisfaction (room preferences)

### **For System**
- ✅ Scales to 200 hotels, 20,000 rooms
- ✅ Complete data isolation per hotel
- ✅ Efficient query performance
- ✅ Robust audit trail

---

## 🚀 **Next Steps**

1. **Review this plan** with stakeholders
2. **Prioritize phases** based on business needs
3. **Start with Phase 1** (database schema)
4. **Test with small hotel** before full rollout
5. **Iterate based on feedback**

---

**📝 Note**: This plan aligns with our scalability architecture document (`ARCHITECTURE_SCALABILITY_PLAN.md`) and ensures proper multi-tenant isolation for 200 hotels with 20,000 rooms.
