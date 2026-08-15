/**
 * Testes das regras de arquivo de mídia.
 *
 * Contexto: allowlist e limite viviam duplicados entre servidor e client, e o
 * limite era um número único de 50MB para tudo — o que inviabilizava vídeo.
 * Agora o limite é POR TIPO e o content-type cai para a extensão quando o
 * navegador não informa `file.type`. Estes testes travam os dois pontos.
 */
import { test } from "node:test"
import assert from "node:assert/strict"

import {
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_BY_TYPE,
  getMaxSizeForMime,
  isAllowedMimeType,
  mimeFromExtension,
  resolveContentType,
  formatFileSize,
  ACCEPT_ATTRIBUTE,
  describeLimits,
  describeAllowedTypes,
} from "./constants"

const MB = 1024 * 1024

test("vídeo tem limite maior que imagem/PDF/apresentação", () => {
  assert.equal(getMaxSizeForMime("video/mp4"), 500 * MB)
  assert.equal(getMaxSizeForMime("video/quicktime"), 500 * MB)
  assert.equal(getMaxSizeForMime("image/png"), 50 * MB)
  assert.equal(getMaxSizeForMime("application/pdf"), 50 * MB)
  assert.ok(MAX_FILE_SIZE_BY_TYPE.VIDEO > MAX_FILE_SIZE_BY_TYPE.IMAGE)
})

test("MAX_FILE_SIZE é o teto absoluto, não o limite de qualquer tipo", () => {
  assert.equal(MAX_FILE_SIZE, 500 * MB)
  // Uma imagem de 200MB está sob o teto absoluto mas acima do limite dela.
  assert.ok(200 * MB < MAX_FILE_SIZE)
  assert.ok(200 * MB > getMaxSizeForMime("image/png"))
})

test("MIME desconhecido cai no MENOR limite, nunca no maior", () => {
  const menor = Math.min(...Object.values(MAX_FILE_SIZE_BY_TYPE))
  assert.equal(getMaxSizeForMime("application/x-coisa"), menor)
  assert.equal(getMaxSizeForMime(""), menor)
})

test("500MB cabe em Int do Postgres (fileSize é Int no schema)", () => {
  // Se o limite de vídeo passar de ~2.1GB, `Media.fileSize` (INT4) estoura e o
  // confirm falha DEPOIS do upload inteiro. Este teste é o alarme disso.
  assert.ok(MAX_FILE_SIZE < 2_147_483_647)
})

test("content-type sai da extensão quando o navegador não informa file.type", () => {
  // Caso real: .mov e .pptx chegam com type vazio no Windows/Android e eram
  // recusados como "tipo não permitido".
  assert.equal(resolveContentType({ name: "culto.mov", type: "" }), "video/quicktime")
  assert.equal(
    resolveContentType({ name: "slides.pptx", type: "" }),
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  )
  assert.equal(resolveContentType({ name: "foto.JPEG", type: "" }), "image/jpeg")
  assert.equal(resolveContentType({ name: "arquivo.xyz", type: "" }), null)
  assert.equal(resolveContentType({ name: "sem-extensao", type: "" }), null)
})

test("file.type válido tem precedência sobre a extensão", () => {
  assert.equal(resolveContentType({ name: "foto.png", type: "image/jpeg" }), "image/jpeg")
})

test("mimeFromExtension cobre jpg e jpeg", () => {
  assert.equal(mimeFromExtension("a.jpg"), "image/jpeg")
  assert.equal(mimeFromExtension("a.jpeg"), "image/jpeg")
})

test("allowlist não aceita tipo perigoso", () => {
  assert.equal(isAllowedMimeType("image/svg+xml"), false)
  assert.equal(isAllowedMimeType("text/html"), false)
  assert.equal(isAllowedMimeType("application/javascript"), false)
})

test("accept do input é derivado da allowlist", () => {
  for (const ext of [".png", ".jpg", ".mp4", ".mov", ".pdf", ".pptx"]) {
    assert.ok(ACCEPT_ATTRIBUTE.includes(ext), `faltou ${ext}`)
  }
})

test("describeLimits fala de TAMANHO e agrupa por limite", () => {
  const texto = describeLimits()
  assert.match(texto, /vídeos até 500MB/)
  assert.match(texto, /50MB/)
  // Deve citar cada grupo uma vez só, não repetir o mesmo limite por tipo.
  assert.equal(texto.match(/500MB/g)?.length, 1)
})

test("describeAllowedTypes fala de TIPO, não de tamanho", () => {
  const texto = describeAllowedTypes()
  // A mensagem de "tipo não permitido" usava describeLimits() e respondia com
  // tamanhos a uma pergunta sobre formatos.
  assert.doesNotMatch(texto, /MB/)
  for (const ext of ["PNG", "JPG", "MP4", "MOV", "PDF", "PPTX"]) {
    assert.ok(texto.includes(ext), `faltou ${ext}`)
  }
})

test("formatFileSize é legível e não quebra com zero", () => {
  assert.equal(formatFileSize(0), "0 Bytes")
  assert.equal(formatFileSize(500 * MB), "500 MB")
  assert.equal(formatFileSize(1024), "1 KB")
})
