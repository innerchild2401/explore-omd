# 🏗️ OMD Platform Architecture & Scalability Plan

## **📊 System Scale Requirements:**
- **200 hotels** across multiple OMDs
- **20,000 total rooms** (average 100 rooms per hotel)
- **Multi-tenant architecture** with complete data isolation
- **Real-time availability** and booking management
- **Channel manager integration** ready

## **🎯 Core Architecture Principles:**

### **1. Multi-Tenant Data Isolation:**
```
OMD Level (Destination)
├── Business Level (Hotel)
├── Room Type Level (Double, Single, Suite)
├── Individual Room Level (Room 201, Room 202, etc.)
└── Availability Level (Per individual room)
```

### **2. Database Structure:**
```sql
-- Core tenant isolation
omds (destination level)
├── businesses (hotel level) 
├── room_types (Double, Single, Suite)
├── individual_rooms (Room 201, Room 202, etc.)
├── room_availability (by individual room)
├── reservations (with specific room assignment)
└── housekeeping_tasks (per individual room)
```

### **3. Scalability Optimizations:**

#### **A. Database Partitioning:**
- **Partition by OMD ID** for better performance
- **Partition room_availability** by date ranges
- **Use proper indexing** on (omd_id, business_id, room_id, date)

#### **B. Caching Strategy:**
- **Redis caching** for frequently accessed data
- **Room availability cache** - 30 days ahead
- **Room type availability** - Aggregated by room type
- **Business data cache** - Hotel information

#### **C. Query Optimization:**
- **Efficient availability queries** using proper joins
- **Date range optimization** for large datasets
- **Real-time updates** using database triggers

## **🔒 Security & Access Control:**

### **1. Row Level Security (RLS):**
```sql
-- Hotel isolation
CREATE POLICY "hotel_isolation" ON individual_rooms
FOR ALL TO authenticated
USING (
  business_id IN (
    SELECT id FROM businesses 
    WHERE owner_id = auth.uid()
  )
);
```

### **2. API Rate Limiting:**
- **Per-OMD limits** - Prevent cross-tenant interference
- **Per-business limits** - Prevent abuse by individual hotels
- **Global limits** - System-wide protection

## **📈 Performance Targets:**

### **1. Query Performance:**
- **Room availability queries** < 100ms
- **Reservation creation** < 200ms
- **Dashboard loading** < 500ms

### **2. Scalability Metrics:**
- **Concurrent users** - 1000+ per OMD
- **Reservations per minute** - 100+
- **Room availability updates** - Real-time

## **🚀 Implementation Phases:**

### **Phase 1: Current Fixes (NOW)**
- ✅ Fix room types display in availability dashboard
- ✅ Ensure proper tenant isolation
- ✅ Clean up debug logging

### **Phase 2: Individual Room System**
- 🔄 Create individual room records
- 🔄 Implement room assignment logic
- 🔄 Add housekeeping management
- 🔄 Room status tracking (clean, dirty, occupied, out-of-order)

### **Phase 3: Scalability Optimization**
- 🔄 Database partitioning implementation
- 🔄 Redis caching layer
- 🔄 Query optimization
- 🔄 Performance monitoring

### **Phase 4: Advanced Features**
- 🔄 Channel manager integration
- 🔄 Advanced reporting
- 🔄 Mobile app optimization
- 🔄 API rate limiting

## **💾 Data Model for 20k Rooms:**

### **Example: One Hotel with 222 Rooms**
```sql
room_types:
- id: 1, business_id: hotel_1, name: "Double", quantity: 110
- id: 2, business_id: hotel_1, name: "Single", quantity: 110  
- id: 3, business_id: hotel_1, name: "Suite", quantity: 2

individual_rooms:
- id: 1, room_type_id: 1, room_number: "201", floor: 2
- id: 2, room_type_id: 1, room_number: "202", floor: 2
- ... (110 double rooms)
- id: 111, room_type_id: 2, room_number: "301", floor: 3
- ... (110 single rooms)
- id: 221, room_type_id: 3, room_number: "501", floor: 5
- id: 222, room_type_id: 3, room_number: "502", floor: 5

room_availability:
- room_id: 1, date: 2025-10-27, available: true, status: "clean"
- room_id: 2, date: 2025-10-27, available: false, status: "occupied"
- ... (20k rooms × 365 days = 7.3M records)
```

## **🔧 Technical Implementation:**

### **1. Efficient Queries:**
```sql
-- Get availability by room type (fast)
SELECT 
  rt.name,
  COUNT(ra.room_id) as available_count,
  rt.quantity as total_count
FROM room_types rt
JOIN individual_rooms ir ON rt.id = ir.room_type_id
LEFT JOIN room_availability ra ON ir.id = ra.room_id 
  AND ra.date = '2025-10-27' 
  AND ra.available = true
WHERE rt.business_id = $hotel_id
GROUP BY rt.id, rt.name, rt.quantity;
```

### **2. Database Triggers:**
- **Auto-update room availability** on reservation changes
- **Maintain data consistency** across related tables
- **Real-time inventory updates**

### **3. Caching Strategy:**
- **Room availability** - Cache for 30 days ahead
- **Room types** - Cache hotel room configurations
- **Business data** - Cache hotel information
- **User sessions** - Cache authentication data

## **📋 Development Guidelines:**

### **1. Always Consider:**
- **Multi-tenant isolation** - Never mix data between hotels
- **Performance impact** - Optimize for large datasets
- **Scalability** - Design for 20k+ rooms
- **Security** - Proper RLS policies

### **2. Code Standards:**
- **Efficient queries** - Use proper joins and indexes
- **Error handling** - Graceful degradation
- **Logging** - Structured logging for debugging
- **Testing** - Test with large datasets

### **3. Database Changes:**
- **Migration files** - Always create proper migrations
- **Backup strategy** - Test migrations on staging
- **Rollback plan** - Ensure reversibility

## **🎯 Success Metrics:**

### **1. Performance:**
- **Page load times** < 2 seconds
- **API response times** < 500ms
- **Database query times** < 100ms

### **2. Scalability:**
- **Support 200 hotels** simultaneously
- **Handle 20k rooms** efficiently
- **Process 100+ reservations/minute**

### **3. Reliability:**
- **99.9% uptime** target
- **Zero data loss** guarantee
- **Graceful error handling**

---

**📝 Note:** This document should be referenced for all future development decisions. Every feature, optimization, and architectural change should align with these scalability requirements.
