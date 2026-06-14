export const PROVIDER_PRESETS = {
  gmail: { host: 'smtp.gmail.com', port: 465 },
  outlook: { host: 'smtp-mail.outlook.com', port: 587 },
} as const;

export type SenderProvider = keyof typeof PROVIDER_PRESETS | 'custom';
