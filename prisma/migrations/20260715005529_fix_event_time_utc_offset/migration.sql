-- Correção do fuso horário dos horários de evento (startTime/endTime).
--
-- O código antigo (date-utils.parseLocalTime) usava a âncora fixa 2000-01-01,
-- que em São Paulo estava em HORÁRIO DE VERÃO (UTC-2). Com isso, cada
-- startTime/endTime foi persistido com +2h em relação ao horário real digitado
-- (ex.: culto "19:00" ficou gravado como 21:00 no banco).
--
-- O código foi corrigido para tratar @db.Time como wall-clock ancorado em UTC.
-- Esta migração realinha os dados LEGADOS subtraindo 2h. O tipo `time` do
-- PostgreSQL faz wraparound automático (ex.: 01:00 - 2h => 23:00).
--
-- Executada uma única vez pelo Prisma, no mesmo deploy que sobe a correção.
UPDATE "events" SET "startTime" = "startTime" - INTERVAL '2 hours';
UPDATE "events" SET "endTime"   = "endTime"   - INTERVAL '2 hours' WHERE "endTime" IS NOT NULL;
