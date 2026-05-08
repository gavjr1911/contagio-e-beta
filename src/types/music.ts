// Types para musicas e bandas

export interface Song {
  id: string;
  name: string;
  artist: string;
  defaultKey: string;
  lyrics?: string;
  chordLink?: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
  tags: string[];
  timesPlayed: number;
  lastPlayedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SongEvent {
  id: string;
  eventName: string;
  eventDate: Date;
  keyPlayed: string;
}

export interface SongWithHistory extends Song {
  eventHistory: SongEvent[];
}

export interface Band {
  id: string;
  name: string;
  description?: string;
  members: BandMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BandMember {
  id: string;
  name: string;
  avatarUrl?: string;
  instruments: string[];
}

export interface BandEvent {
  id: string;
  eventName: string;
  eventDate: Date;
}

export interface BandWithHistory extends Band {
  eventHistory: BandEvent[];
}

export interface SetlistItem {
  id: string;
  songId: string;
  song: Song;
  key: string;
  order: number;
  notes?: string;
}

export interface Setlist {
  id: string;
  eventId: string;
  eventName: string;
  eventDate: Date;
  items: SetlistItem[];
}

// Filters and sorting
export type SongSortOption = "name" | "most_played" | "last_played";

export interface SongFilters {
  search?: string;
  tags?: string[];
  sortBy?: SongSortOption;
}

// API Response types
export interface SongsResponse {
  songs: Song[];
  total: number;
}

export interface BandsResponse {
  bands: Band[];
  total: number;
}

// Form types
export interface CreateSongInput {
  name: string;
  artist: string;
  defaultKey: string;
  lyrics?: string;
  chordLink?: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
  tags: string[];
}

export interface UpdateSongInput extends Partial<CreateSongInput> {
  id: string;
}

export interface CreateBandInput {
  name: string;
  description?: string;
  memberIds: string[];
}

export interface UpdateBandInput extends Partial<CreateBandInput> {
  id: string;
}

// Musical keys for transposition
export const MUSICAL_KEYS = [
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
] as const;

export type MusicalKey = (typeof MUSICAL_KEYS)[number];

// Common tags for songs
export const COMMON_SONG_TAGS = [
  "Adoracao",
  "Louvor",
  "Comunhao",
  "Celebracao",
  "Intimidade",
  "Avivamento",
  "Natal",
  "Pascoa",
  "Batismo",
  "Santa Ceia",
] as const;

// Common instruments
export const COMMON_INSTRUMENTS = [
  "Vocal",
  "Violao",
  "Guitarra",
  "Baixo",
  "Bateria",
  "Teclado",
  "Piano",
  "Saxofone",
  "Trompete",
  "Flauta",
  "Percussao",
] as const;
