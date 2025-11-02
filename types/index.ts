// Core OMD types
export interface OMD {
  id: string;
  name: string;
  slug: string;
  theme: Record<string, any>;
  logo: string | null;
  colors: Record<string, string>;
  created_at: string;
  updated_at: string;
}

// Section types
export interface Section {
  id: string;
  omd_id: string;
  type: SectionType;
  content: Record<string, any>;
  is_visible: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export type SectionType = 
  | 'hero'
  | 'explore'
  | 'stays'
  | 'restaurants'
  | 'experiences'
  | 'events'
  | 'stories'
  | 'map'
  | 'list_business_cta'
  | 'footer';

// Business types
export interface Business {
  id: string;
  omd_id: string;
  type: BusinessType;
  slug: string;
  name: string;
  description: string;
  images: string[];
  location: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    socials?: Record<string, string>;
  };
  rating: number;
  status: 'active' | 'inactive' | 'pending';
  owner_id: string;
  area_id?: string | null;
  areas?: {
    id: string;
    name: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export type BusinessType = 'hotel' | 'restaurant' | 'experience';

// Hotel-specific types
export interface Room {
  id: string;
  hotel_id: string;
  name: string;
  type: string;
  capacity: number;
  price_per_night: number;
  images: string[];
  amenities: string[];
  is_available: boolean;
}

export interface HotelReservation {
  id: string;
  hotel_id: string;
  room_id: string;
  guest_id: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status: 'pending' | 'paid' | 'refunded';
  created_at: string;
}

// Restaurant-specific types
export interface MenuItem {
  id: string;
  restaurant_id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  available: boolean;
  allergens?: string[];
}

export interface RestaurantOrder {
  id: string;
  restaurant_id: string;
  customer_id: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  delivery_address: string | null;
  pickup_time: string | null;
  created_at: string;
}

export interface OrderItem {
  menu_item_id: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface RestaurantReservation {
  id: string;
  restaurant_id: string;
  customer_id: string;
  date: string;
  time: string;
  guests: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  special_requests?: string;
  created_at: string;
}

// Experience-specific types
export interface ExperienceAvailability {
  id: string;
  experience_id: string;
  date: string;
  time_slot: string;
  capacity: number;
  booked: number;
  price: number;
}

export interface ExperienceBooking {
  id: string;
  experience_id: string;
  customer_id: string;
  availability_id: string;
  participants: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status: 'pending' | 'paid' | 'refunded';
  created_at: string;
}

// Translation types
export interface Translation {
  id: string;
  omd_id: string;
  entity_type: string;
  entity_id: string;
  language: string;
  content: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// User types
export interface User {
  id: string;
  email: string;
  role: UserRole;
  profile: {
    name?: string;
    avatar?: string;
    phone?: string;
  };
  created_at: string;
}

export type UserRole = 'super_admin' | 'omd_admin' | 'business_owner' | 'visitor';

// CRM types
export interface Customer {
  id: string;
  business_id: string;
  user_id?: string;
  name: string;
  email: string;
  phone?: string;
  preferences?: Record<string, any>;
  booking_history: string[];
  created_at: string;
  updated_at: string;
}

// Email template types
export interface EmailTemplate {
  id: string;
  business_id: string;
  type: EmailTemplateType;
  subject: string;
  content: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export type EmailTemplateType = 
  | 'booking_confirmation'
  | 'reservation_confirmation'
  | 'order_confirmation'
  | 'cancellation'
  | 'reminder'
  | 'promotional';

