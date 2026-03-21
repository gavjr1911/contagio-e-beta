/**
 * ProPresenter Sync Functions
 *
 * Funcoes para sincronizar musicas e setlists entre o sistema e o ProPresenter
 *
 * IMPORTANTE: O ProPresenter precisa estar com a API habilitada em:
 * Settings > Network > Enable Network
 */

import { prisma } from "@/lib/prisma"
import { getProPresenterClient, type ProPresenterClient } from "./client"
import {
  getLibraryPresentations,
  createPlaylist,
  addPlaylistItem,
  searchPresentations,
  getPlaylists,
} from "./api"
import type {
  SyncResult,
  SyncError,
  SongMapping,
  LibraryItem,
  ProPresenterError,
} from "./types"

// ============================================================================
// Sincronizacao de Musicas
// ============================================================================

/**
 * Importa musicas da biblioteca do ProPresenter
 * Cria novas musicas no banco ou atualiza o propresenterId das existentes
 */
export async function syncSongsFromLibrary(
  options: {
    dryRun?: boolean
    overwrite?: boolean
  } = {},
  client?: ProPresenterClient
): Promise<SyncResult> {
  const { dryRun = false, overwrite = false } = options
  const pp = client ?? getProPresenterClient()

  const result: SyncResult = {
    success: true,
    synced: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  try {
    // Obtem todas as apresentacoes da biblioteca
    const presentations = await getLibraryPresentations(pp)

    // Obtem todas as musicas existentes
    const existingSongs = await prisma.song.findMany({
      select: {
        id: true,
        name: true,
        propresenterId: true,
      },
    })

    // Cria mapa por nome para busca rapida
    const songsByName = new Map(
      existingSongs.map((song) => [normalizeForMatch(song.name), song])
    )

    // Cria mapa por propresenterId
    const songsByPpId = new Map(
      existingSongs
        .filter((song) => song.propresenterId)
        .map((song) => [song.propresenterId!, song])
    )

    for (const presentation of presentations) {
      try {
        const presentationName = presentation.id.name
        const presentationId = presentation.id.uuid
        const normalizedName = normalizeForMatch(presentationName)

        // Verifica se ja existe uma musica vinculada a essa apresentacao
        const existingByPpId = songsByPpId.get(presentationId)
        if (existingByPpId && !overwrite) {
          result.skipped++
          continue
        }

        // Busca musica por nome similar
        const existingByName = songsByName.get(normalizedName)

        if (existingByName) {
          // Atualiza o propresenterId da musica existente
          if (!dryRun) {
            await prisma.song.update({
              where: { id: existingByName.id },
              data: { propresenterId: presentationId },
            })
          }
          result.updated++
        } else {
          // Cria nova musica
          if (!dryRun) {
            await prisma.song.create({
              data: {
                name: presentationName,
                propresenterId: presentationId,
                tags: ["propresenter"],
              },
            })
          }
          result.created++
        }

        result.synced++
      } catch (error) {
        result.errors.push({
          item: presentation.id.name,
          error: error instanceof Error ? error.message : "Erro desconhecido",
        })
      }
    }
  } catch (error) {
    result.success = false
    result.errors.push({
      item: "biblioteca",
      error: error instanceof Error ? error.message : "Erro ao acessar biblioteca",
    })
  }

  return result
}

/**
 * Obtem preview das musicas que serao sincronizadas
 */
export async function getSyncPreview(
  client?: ProPresenterClient
): Promise<{
  toCreate: LibraryItem[]
  toUpdate: { song: { id: string; name: string }; presentation: LibraryItem }[]
  toSkip: LibraryItem[]
}> {
  const pp = client ?? getProPresenterClient()

  const toCreate: LibraryItem[] = []
  const toUpdate: { song: { id: string; name: string }; presentation: LibraryItem }[] = []
  const toSkip: LibraryItem[] = []

  const presentations = await getLibraryPresentations(pp)

  const existingSongs = await prisma.song.findMany({
    select: {
      id: true,
      name: true,
      propresenterId: true,
    },
  })

  const songsByName = new Map(
    existingSongs.map((song) => [normalizeForMatch(song.name), song])
  )

  const songsByPpId = new Map(
    existingSongs
      .filter((song) => song.propresenterId)
      .map((song) => [song.propresenterId!, song])
  )

  for (const presentation of presentations) {
    const presentationId = presentation.id.uuid
    const normalizedName = normalizeForMatch(presentation.id.name)

    if (songsByPpId.has(presentationId)) {
      toSkip.push(presentation)
      continue
    }

    const existingByName = songsByName.get(normalizedName)
    if (existingByName) {
      toUpdate.push({ song: existingByName, presentation })
    } else {
      toCreate.push(presentation)
    }
  }

  return { toCreate, toUpdate, toSkip }
}

// ============================================================================
// Exportacao de Setlist
// ============================================================================

/**
 * Exporta a setlist de um evento para uma playlist no ProPresenter
 */
export async function exportSetlistToPlaylist(
  eventId: string,
  options: {
    playlistName?: string
    overwrite?: boolean
  } = {},
  client?: ProPresenterClient
): Promise<{
  success: boolean
  playlistId?: string
  playlistName?: string
  itemsAdded: number
  errors: SyncError[]
}> {
  const { overwrite = false } = options
  const pp = client ?? getProPresenterClient()

  const result = {
    success: true,
    playlistId: undefined as string | undefined,
    playlistName: undefined as string | undefined,
    itemsAdded: 0,
    errors: [] as SyncError[],
  }

  try {
    // Obtem o evento com setlist
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        setlists: {
          orderBy: { order: "asc" },
          include: {
            song: true,
          },
        },
      },
    })

    if (!event) {
      result.success = false
      result.errors.push({ item: eventId, error: "Evento nao encontrado" })
      return result
    }

    // Gera nome da playlist
    const playlistName =
      options.playlistName ||
      `${event.name} - ${event.date.toLocaleDateString("pt-BR")}`

    result.playlistName = playlistName

    // Verifica se a playlist ja existe
    const existingPlaylists = await getPlaylists(pp)
    const existing = existingPlaylists.find(
      (p) => p.id.name.toLowerCase() === playlistName.toLowerCase()
    )

    if (existing && !overwrite) {
      result.success = false
      result.errors.push({
        item: playlistName,
        error: "Playlist ja existe. Use overwrite=true para sobrescrever",
      })
      return result
    }

    // Cria a playlist
    const playlist = await createPlaylist(playlistName, undefined, pp)
    result.playlistId = playlist.id.uuid

    // Adiciona cada musica da setlist
    for (const setlistItem of event.setlists) {
      const song = setlistItem.song

      if (!song.propresenterId) {
        // Tenta encontrar a apresentacao por nome
        const presentations = await searchPresentations(song.name, pp)

        if (presentations.length === 0) {
          result.errors.push({
            item: song.name,
            error: "Apresentacao nao encontrada no ProPresenter",
          })
          continue
        }

        // Usa a primeira correspondencia
        const presentationId = presentations[0].id.uuid

        // Atualiza o propresenterId da musica
        await prisma.song.update({
          where: { id: song.id },
          data: { propresenterId: presentationId },
        })

        // Adiciona a playlist
        await addPlaylistItem(
          playlist.id.uuid,
          { id: presentationId, type: "presentation" },
          pp
        )
      } else {
        // Adiciona usando o propresenterId existente
        await addPlaylistItem(
          playlist.id.uuid,
          { id: song.propresenterId, type: "presentation" },
          pp
        )
      }

      result.itemsAdded++
    }
  } catch (error) {
    result.success = false
    result.errors.push({
      item: "exportacao",
      error: error instanceof Error ? error.message : "Erro na exportacao",
    })
  }

  return result
}

// ============================================================================
// Mapeamento de Musicas
// ============================================================================

/**
 * Vincula uma musica do sistema a uma apresentacao do ProPresenter
 */
export async function mapSongToPresentation(
  songId: string,
  presentationId: string
): Promise<SongMapping> {
  const song = await prisma.song.update({
    where: { id: songId },
    data: { propresenterId: presentationId },
  })

  return {
    songId: song.id,
    presentationId,
    presentationName: song.name,
    mappedAt: new Date(),
  }
}

/**
 * Remove o vinculo de uma musica com o ProPresenter
 */
export async function unmapSong(songId: string): Promise<void> {
  await prisma.song.update({
    where: { id: songId },
    data: { propresenterId: null },
  })
}

/**
 * Lista todas as musicas vinculadas ao ProPresenter
 */
export async function getMappedSongs(): Promise<
  { id: string; name: string; propresenterId: string }[]
> {
  const songs = await prisma.song.findMany({
    where: {
      propresenterId: { not: null },
    },
    select: {
      id: true,
      name: true,
      propresenterId: true,
    },
  })

  return songs.filter((s) => s.propresenterId !== null) as {
    id: string
    name: string
    propresenterId: string
  }[]
}

/**
 * Lista musicas nao vinculadas ao ProPresenter
 */
export async function getUnmappedSongs(): Promise<
  { id: string; name: string }[]
> {
  return prisma.song.findMany({
    where: {
      propresenterId: null,
    },
    select: {
      id: true,
      name: true,
    },
  })
}

// ============================================================================
// Busca e Correspondencia
// ============================================================================

/**
 * Busca apresentacoes no ProPresenter que correspondem a uma musica
 */
export async function findMatchingPresentations(
  songName: string,
  client?: ProPresenterClient
): Promise<LibraryItem[]> {
  const pp = client ?? getProPresenterClient()
  return searchPresentations(songName, pp)
}

/**
 * Auto-mapeia musicas para apresentacoes com nomes correspondentes
 */
export async function autoMapSongs(
  options: { threshold?: number } = {},
  client?: ProPresenterClient
): Promise<{
  mapped: { songId: string; songName: string; presentationId: string }[]
  notFound: { songId: string; songName: string }[]
}> {
  const { threshold = 0.8 } = options
  const pp = client ?? getProPresenterClient()

  const mapped: { songId: string; songName: string; presentationId: string }[] = []
  const notFound: { songId: string; songName: string }[] = []

  const unmappedSongs = await getUnmappedSongs()
  const presentations = await getLibraryPresentations(pp)

  const presentationsMap = new Map(
    presentations.map((p) => [normalizeForMatch(p.id.name), p])
  )

  for (const song of unmappedSongs) {
    const normalizedSongName = normalizeForMatch(song.name)
    const exactMatch = presentationsMap.get(normalizedSongName)

    if (exactMatch) {
      await mapSongToPresentation(song.id, exactMatch.id.uuid)
      mapped.push({
        songId: song.id,
        songName: song.name,
        presentationId: exactMatch.id.uuid,
      })
    } else {
      // Busca fuzzy match
      let bestMatch: LibraryItem | null = null
      let bestScore = 0

      for (const presentation of presentations) {
        const score = calculateSimilarity(
          normalizedSongName,
          normalizeForMatch(presentation.id.name)
        )
        if (score > bestScore && score >= threshold) {
          bestScore = score
          bestMatch = presentation
        }
      }

      if (bestMatch) {
        await mapSongToPresentation(song.id, bestMatch.id.uuid)
        mapped.push({
          songId: song.id,
          songName: song.name,
          presentationId: bestMatch.id.uuid,
        })
      } else {
        notFound.push({ songId: song.id, songName: song.name })
      }
    }
  }

  return { mapped, notFound }
}

// ============================================================================
// Utilitarios
// ============================================================================

/**
 * Normaliza texto para comparacao
 */
function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9\s]/g, "") // Remove caracteres especiais
    .replace(/\s+/g, " ") // Normaliza espacos
    .trim()
}

/**
 * Calcula similaridade entre duas strings (0-1)
 * Usa algoritmo de Levenshtein normalizado
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1

  const len1 = str1.length
  const len2 = str2.length

  if (len1 === 0 || len2 === 0) return 0

  const matrix: number[][] = []

  // Inicializa matriz
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  // Preenche matriz
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // Delecao
        matrix[i][j - 1] + 1, // Insercao
        matrix[i - 1][j - 1] + cost // Substituicao
      )
    }
  }

  const distance = matrix[len1][len2]
  const maxLen = Math.max(len1, len2)

  return 1 - distance / maxLen
}
