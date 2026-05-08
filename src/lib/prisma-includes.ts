import { Prisma } from "@/generated/prisma/client"

// User select patterns
export const userSelectMinimal = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const satisfies Prisma.UserSelect

// Song select patterns
export const songSelectMinimal = {
  id: true,
  name: true,
  artist: true,
  defaultKey: true,
} as const satisfies Prisma.SongSelect

export const songSelectWithChord = {
  ...songSelectMinimal,
  chordLink: true,
} as const satisfies Prisma.SongSelect

// Setlist include patterns
export const setlistItemInclude = {
  song: {
    select: songSelectWithChord,
  },
} as const satisfies Prisma.SetlistInclude

// EventItem include patterns
export const eventItemIncludeBasic = {
  responsible: {
    select: userSelectMinimal,
  },
} as const satisfies Prisma.EventItemInclude

export const eventItemIncludeFull = {
  responsible: {
    select: userSelectMinimal,
  },
  setlistItems: {
    include: setlistItemInclude,
    orderBy: { order: "asc" as const },
  },
  mediaFiles: {
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      url: true,
      fileSize: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
} as const satisfies Prisma.EventItemInclude

// Schedule include patterns
export const scheduleIncludeBasic = {
  user: {
    select: userSelectMinimal,
  },
  ministry: {
    select: { id: true, name: true },
  },
} as const satisfies Prisma.ScheduleInclude

// Ministry member include patterns
export const ministryMemberInclude = {
  user: {
    select: userSelectMinimal,
  },
  positions: {
    include: {
      position: {
        select: { id: true, name: true },
      },
    },
  },
} as const satisfies Prisma.MinistryMemberInclude
