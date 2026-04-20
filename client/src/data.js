export const locationOptions = [
  { id: 'current', label: 'Use my location' },
  { id: 'austin', label: 'Austin, TX', lat: 30.2672, lng: -97.7431 },
  { id: 'san-francisco', label: 'San Francisco, CA', lat: 37.7749, lng: -122.4194 },
  { id: 'new-york', label: 'New York, NY', lat: 40.7128, lng: -74.006 },
];

export const sampleRestroomsByLocation = {
  austin: [
    {
      name: 'Lavender Lounge',
      street: '201 East 6th St',
      accessible: true,
      unisex: false,
    },
    {
      name: 'Capitol Comfort',
      street: '1101 Congress Ave',
      accessible: true,
      unisex: true,
    },
    {
      name: 'Barton Springs Stall',
      street: '2201 William Barton Dr',
      accessible: false,
      unisex: false,
    },
  ],
  'san-francisco': [
    {
      name: 'Pier 39 Powder Room',
      street: 'Beach St & The Embarcadero',
      accessible: true,
      unisex: true,
    },
    {
      name: 'Golden Gate Rest Stop',
      street: '1096 Golden Gate Bridge',
      accessible: false,
      unisex: false,
    },
    {
      name: 'Mission Men\'s Lounge',
      street: '2841 24th St',
      accessible: true,
      unisex: false,
    },
  ],
  'new-york': [
    {
      name: 'Broadway Relief',
      street: '1458 Broadway',
      accessible: true,
      unisex: true,
    },
    {
      name: 'Chelsea Comfort',
      street: '332 W 15th St',
      accessible: true,
      unisex: false,
    },
    {
      name: 'Central Park Stop',
      street: '5 Av & E 72nd St',
      accessible: false,
      unisex: true,
    },
  ],
};

export function getSampleRestroomsForLocation(locationId) {
  return sampleRestroomsByLocation[locationId] || [];
}
