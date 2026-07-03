-- Festival Gastronômico (votação pública) — tabela temporária do evento 04/07/2026.
-- Pode ser removida após o uso: DROP TABLE "festival_votes";

CREATE TABLE "festival_votes" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "barracaBonita" TEXT NOT NULL,
    "melhorAtendimento" TEXT NOT NULL,
    "gastronomiaSalgada" TEXT NOT NULL,
    "gastronomiaDoce" TEXT NOT NULL,
    "espiritoBeta" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "festival_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "festival_votes_phone_key" ON "festival_votes"("phone");

CREATE INDEX "festival_votes_createdAt_idx" ON "festival_votes"("createdAt");
