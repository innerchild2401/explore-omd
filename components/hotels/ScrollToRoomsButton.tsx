'use client';

interface ScrollToRoomsButtonProps {
  hasSearchParams: boolean;
}

export default function ScrollToRoomsButton({ hasSearchParams }: ScrollToRoomsButtonProps) {
  const handleScrollToRooms = () => {
    // Try multiple approaches to find the rooms section
    const roomsSection = document.getElementById('rooms-section');
    
    if (roomsSection) {
      console.log('Found rooms section, scrolling...');
      // Add a small offset to account for sticky header
      const headerHeight = 80;
      const elementPosition = roomsSection.offsetTop - headerHeight;
      
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    } else {
      console.log('Rooms section not found, trying alternative approach...');
      // Fallback: scroll to any element with "room" in the text
      const roomElements = document.querySelectorAll('[class*="room"], h2');
      for (let i = 0; i < roomElements.length; i++) {
        const element = roomElements[i];
        if (element.textContent?.toLowerCase().includes('room')) {
          console.log('Found room element, scrolling...');
          const headerHeight = 80;
          const elementPosition = (element as HTMLElement).offsetTop - headerHeight;
          
          window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
          });
          break;
        }
      }
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
