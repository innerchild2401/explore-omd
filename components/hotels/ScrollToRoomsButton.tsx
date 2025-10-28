'use client';

interface ScrollToRoomsButtonProps {
  hasSearchParams: boolean;
}

export default function ScrollToRoomsButton({ hasSearchParams }: ScrollToRoomsButtonProps) {
  const handleScrollToRooms = () => {
    const roomsSection = document.getElementById('rooms-section');
    if (roomsSection) {
      roomsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <button
      onClick={handleScrollToRooms}
      className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
    >
      {hasSearchParams ? 'View Available Rooms' : 'Book Now'}
    </button>
  );
}
