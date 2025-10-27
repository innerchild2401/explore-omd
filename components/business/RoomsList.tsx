'use client';

import { useState } from 'react';
import Link from 'next/link';
import RoomModal from './RoomModal';
import PricingCalendar from './PricingCalendar';
import IndividualRoomsManager from './IndividualRoomsManager';

interface RoomsListProps {
  hotelId: string;
  rooms: any[];
  amenities: any[];
}

export default function RoomsList({ hotelId, rooms, amenities }: RoomsListProps) {
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showIndividualRooms, setShowIndividualRooms] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [pricingRoom, setPricingRoom] = useState<any>(null);
  const [selectedRoomType, setSelectedRoomType] = useState<any>(null);

  const handleAddRoom = () => {
    setEditingRoom(null);
    setShowRoomModal(true);
  };

  const handleEditRoom = (room: any) => {
    setEditingRoom(room);
    setShowRoomModal(true);
  };

  const handleManagePricing = (room: any) => {
    setPricingRoom(room);
    setShowPricingModal(true);
  };

  const handleManageIndividualRooms = (room: any) => {
    setSelectedRoomType(room);
    setShowIndividualRooms(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rooms</h2>
          <p className="text-gray-600">Manage your room types and pricing</p>
        </div>
        <button
          onClick={handleAddRoom}
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
        >
          + Add Room Type
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h4" />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-gray-900">No rooms yet</h3>
          <p className="mb-6 text-gray-600">Add your first room type to start accepting bookings</p>
          <button
            onClick={handleAddRoom}
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            + Add Room Type
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {rooms.map((room) => (
            <div key={room.id} className="rounded-lg border border-gray-200 bg-white p-6 shadow">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{room.name}</h3>
                  <p className="text-sm text-gray-600 capitalize">{room.room_type.replace('_', ' ')}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  room.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {room.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mb-4 space-y-2 text-sm text-gray-600">
                <p>👥 Max Occupancy: {room.max_occupancy}</p>
                <p>💰 Base Price: ${room.base_price}/night</p>
                {room.size_sqm && <p>📐 Size: {room.size_sqm} sqm</p>}
                <p>🏠 Quantity: {room.quantity} room(s)</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEditRoom(room)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleManagePricing(room)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Pricing
                </button>
                <button
                  onClick={() => handleManageIndividualRooms(room)}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                >
                  🏠 Individual Rooms
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showRoomModal && (
        <RoomModal
          hotelId={hotelId}
          room={editingRoom}
          amenities={amenities}
          onClose={() => {
            setShowRoomModal(false);
            setEditingRoom(null);
          }}
        />
      )}

      {showPricingModal && pricingRoom && (
        <PricingCalendar
          room={pricingRoom}
          onClose={() => {
            setShowPricingModal(false);
            setPricingRoom(null);
          }}
        />
      )}

      {showIndividualRooms && selectedRoomType && (
        <IndividualRoomsManager
          roomTypeId={selectedRoomType.id}
          roomTypeName={selectedRoomType.name}
          onClose={() => {
            setShowIndividualRooms(false);
            setSelectedRoomType(null);
          }}
        />
      )}
    </div>
  );
}

