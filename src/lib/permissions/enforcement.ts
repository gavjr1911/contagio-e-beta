/**
 * Feature flag do enforcement por AÇÃO (ver/criar/editar/excluir).
 *
 * Fase 0a: OFF (o enforcement continua por nível, comportamento atual).
 * Fase 1+: ligar por `PERMISSIONS_ACTION_ENFORCEMENT=on` no ambiente para
 * separar "subir o código" de "ativar o enforcement" (rede de segurança —
 * permite desligar sem redeploy).
 */
export function isActionEnforcementOn(): boolean {
  return process.env.PERMISSIONS_ACTION_ENFORCEMENT === "on";
}
