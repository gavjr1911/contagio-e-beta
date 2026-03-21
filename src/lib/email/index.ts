// Cliente de envio
export { sendEmail, sendBatchEmails, resend } from "./client"
export type { SendEmailOptions, SendEmailResult } from "./client"

// Funcoes de envio especificas
export {
  sendScheduleInvite,
  sendScheduleReminder,
  sendScheduleConfirmation,
  sendScheduleChanged,
  sendSetlistUpdate,
  sendAllReminders,
  getSchedulesForReminder,
  generateConfirmToken,
  generateActionUrls,
} from "./send"

// Templates
export { BaseEmail, EmailHeading, EmailText, EmailButton, EmailCard, EmailDivider, EmailHighlight, EmailBadge, colors } from "./templates/base"
export { ScheduleInviteEmail } from "./templates/schedule-invite"
export { ScheduleReminderEmail } from "./templates/schedule-reminder"
export { ScheduleConfirmedEmail } from "./templates/schedule-confirmed"
export { ScheduleChangedEmail } from "./templates/schedule-changed"
export { SetlistUpdateEmail } from "./templates/setlist-update"

// Types dos templates
export type { ScheduleInviteEmailProps } from "./templates/schedule-invite"
export type { ScheduleReminderEmailProps } from "./templates/schedule-reminder"
export type { ScheduleConfirmedEmailProps } from "./templates/schedule-confirmed"
export type { ScheduleChangedEmailProps, ScheduleChange } from "./templates/schedule-changed"
export type { SetlistUpdateEmailProps, SetlistSong } from "./templates/setlist-update"
