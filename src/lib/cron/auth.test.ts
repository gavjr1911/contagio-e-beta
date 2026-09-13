import { describe, it } from "node:test"
import assert from "node:assert/strict"

import { isAuthorizedCronRequest, secureEquals } from "./auth"

describe("secureEquals", () => {
  it("compara valores iguais", () => {
    assert.equal(secureEquals("abc", "abc"), true)
  })

  it("nao lanca com tamanhos diferentes", () => {
    assert.equal(secureEquals("a", "abcdefghij"), false)
  })

  it("rejeita string vazia contra segredo", () => {
    assert.equal(secureEquals("", "segredo"), false)
  })
})

describe("isAuthorizedCronRequest", () => {
  const secret = "s3gr3d0-do-cron"

  it("aceita x-cron-secret correto", () => {
    assert.equal(isAuthorizedCronRequest({ cronSecret: secret }, secret), true)
  })

  it("aceita Authorization Bearer correto", () => {
    assert.equal(
      isAuthorizedCronRequest({ authorization: `Bearer ${secret}` }, secret),
      true
    )
  })

  it("rejeita segredo errado", () => {
    assert.equal(isAuthorizedCronRequest({ cronSecret: "outro" }, secret), false)
  })

  it("rejeita quando nao ha header algum", () => {
    assert.equal(isAuthorizedCronRequest({}, secret), false)
  })

  it("rejeita headers nulos", () => {
    assert.equal(
      isAuthorizedCronRequest({ cronSecret: null, authorization: null }, secret),
      false
    )
  })

  it("rejeita quando o segredo do servidor nao esta configurado", () => {
    assert.equal(isAuthorizedCronRequest({ cronSecret: "qualquer" }, undefined), false)
    assert.equal(isAuthorizedCronRequest({ cronSecret: "" }, ""), false)
  })

  it("ignora headers de provedor forjados (x-vercel-cron nao existe mais)", () => {
    // Regressao: antes bastava `x-vercel-cron: true` para disparar o envio.
    assert.equal(
      isAuthorizedCronRequest(
        { cronSecret: "true", authorization: "Bearer true" },
        secret
      ),
      false
    )
  })

  it("rejeita Authorization sem o prefixo Bearer", () => {
    assert.equal(isAuthorizedCronRequest({ authorization: secret }, secret), false)
  })
})
