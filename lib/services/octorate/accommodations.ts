import { OctorateClient } from './client';
import { OctorateAccommodation } from './types';

export async function pullAccommodations(connectionId: string, hotelId: string): Promise<OctorateAccommodation[]> {
  const client = new OctorateClient(connectionId, hotelId);
  
  // Octorate API endpoint for accommodations
  const accommodations = await client.request<OctorateAccommodation[]>('/accommodations');
  
  return accommodations;
}

