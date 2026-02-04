
import React from 'react';
import { 
  Waves, 
  Wifi, 
  Utensils, 
  Wind, 
  Coffee, 
  Tv, 
  Beer, 
  Palmtree, 
  MonitorPlay 
} from 'lucide-react';
import { Room, Amenity } from './types';

export const RESORT_DATA = {
  name: "Gateway Resort",
  address: "Baccuit Norte, Bauang, Philippines, 2501",
  email: "gatewayresortandrestobar2019@gmail.com",
  phone: {
    landline: "0726079953",
    mobile1: "09398449670",
    mobile2: "09999624610",
    whatsapp: "09694359173"
  }
};

export const HERO_IMAGES = [
  "https://ik.imagekit.io/4pqkojkvky/Gateway%20Resort/81571f6b-9b3a-46ab-8e4b-e3f7cfd7379f.jpg?updatedAt=1769539191912",
  "https://ik.imagekit.io/4pqkojkvky/Gateway%20Resort/3b2cc473-2ff1-46fe-95a4-e4e8daf194c6.jpg?updatedAt=1769539191807",
  "https://ik.imagekit.io/4pqkojkvky/Gateway%20Resort/10cec64d-a1d5-46e4-a899-eda31ea6634f.jpg?updatedAt=1769540349673"
];

export const AMENITIES: Amenity[] = [
  { 
    name: "Sea View Pool", 
    icon: "waves", 
    description: "Our signature swimming pool overlooking the beautiful Lingayen Gulf." 
  },
  { 
    name: "Free Unlimited WiFi", 
    icon: "wifi", 
    description: "Stay connected throughout the resort with our high-speed internet." 
  },
  { 
    name: "Bar & Restaurant", 
    icon: "beer", 
    description: "Savor local delicacies and international drinks at our restobar." 
  },
  { 
    name: "Air Conditioned", 
    icon: "wind", 
    description: "All hotel rooms are fully air-conditioned for your maximum comfort." 
  },
  { 
    name: "Private Beach", 
    icon: "palmtree", 
    description: "Exclusive access to the pristine shores of Bauang." 
  },
  { 
    name: "Catering", 
    icon: "utensils", 
    description: "Professional catering services for weddings, parties, and events." 
  }
];

export const ROOMS: Room[] = [
  {
    id: "1",
    name: "Oceanfront Premiere",
    description: "Wake up to unobstructed views of the sea. Featuring a private balcony and a king-sized bed.",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800",
    type: 'hotel'
  },
  {
    id: "2",
    name: "Sunset Suite",
    description: "Ideally positioned to catch the golden hour. Spacious living area and modern walk-in shower.",
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800",
    type: 'hotel'
  },
  {
    id: "3",
    name: "Tropical Garden Room",
    description: "Surrounded by lush greenery, this ground-floor room offers a peaceful retreat near the pool.",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800",
    type: 'hotel'
  },
  {
    id: "4",
    name: "Native Kubo Superior",
    description: "A premium traditional experience with high-quality bamboo craftsmanship and comfortable bedding.",
    image: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&q=80&w=800",
    type: 'kubo'
  },
  {
    id: "5",
    name: "Barkada Loft Suite",
    description: "Two-level room designed for groups. Accommodates up to 6 people with ease.",
    image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800",
    type: 'hotel'
  },
  {
    id: "6",
    name: "Family Garden Villa",
    description: "A detached cottage offering privacy and plenty of space for family activities.",
    image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&q=80&w=800",
    type: 'cottage'
  },
  {
    id: "7",
    name: "Traditional Kubo Standard",
    description: "Authentic island living. Fan-cooled with fresh sea breeze and shared facility access.",
    image: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&q=80&w=800",
    type: 'kubo'
  },
  {
    id: "8",
    name: "Executive Sea View",
    description: "Perfect for business travelers or couples. Includes a dedicated workspace and premium linens.",
    image: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=800",
    type: 'hotel'
  },
  {
    id: "9",
    name: "Sunrise Balcony Double",
    description: "South-facing room with a beautiful morning light. Features two twin beds.",
    image: "https://images.unsplash.com/photo-1591088398332-8a77d397ef84?auto=format&fit=crop&q=80&w=800",
    type: 'hotel'
  },
  {
    id: "10",
    name: "Poolside Veranda Room",
    description: "Step directly from your terrace into our sea-view swimming pool area.",
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=800",
    type: 'hotel'
  },
  {
    id: "11",
    name: "Private Garden Cottage",
    description: "Tucked away in the quietest corner of the resort. Very romantic and secluded.",
    image: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=800",
    type: 'hotel'
  },
  {
    id: "12",
    name: "Native Kubo Twin",
    description: "Compact traditional hut with two single floor mattresses. Authentic and budget-friendly.",
    image: "https://images.unsplash.com/photo-1549294413-26f195200c16?auto=format&fit=crop&q=80&w=800",
    type: 'kubo'
  },
  {
    id: "13",
    name: "Deluxe Family Quad",
    description: "Features four single beds in a large air-conditioned space. Perfect for friends.",
    image: "https://images.unsplash.com/photo-1566195992011-5f6b21e539aa?auto=format&fit=crop&q=80&w=800",
    type: 'hotel'
  },
  {
    id: "14",
    name: "Penthouse Horizon Suite",
    description: "Our most luxurious offering. Top-floor location with 180-degree ocean views.",
    image: "https://images.unsplash.com/photo-1590490359683-658d3d23f972?auto=format&fit=crop&q=80&w=800",
    type: 'hotel'
  }
];

export const getIcon = (name: string) => {
  switch (name.toLowerCase()) {
    case 'waves': return <Waves className="w-6 h-6" />;
    case 'wifi': return <Wifi className="w-6 h-6" />;
    case 'beer': return <Beer className="w-6 h-6" />;
    case 'wind': return <Wind className="w-6 h-6" />;
    case 'palmtree': return <Palmtree className="w-6 h-6" />;
    case 'utensils': return <Utensils className="w-6 h-6" />;
    default: return <Coffee className="w-6 h-6" />;
  }
};
