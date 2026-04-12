
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

export interface Room {
  id: string;
  name: string;
  description: string;
  image: string;
  type: 'hotel' | 'cottage' | 'kubo';
}

export interface Amenity {
  name: string;
  icon: string;
  description: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
