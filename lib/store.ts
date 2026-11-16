import settings from '../config/store.json';

export const storeSettings = settings;
export function sellerIsReady() {
  return settings.businessVerified && settings.salesEnabled &&
    [settings.legalName, settings.cnpj, settings.businessAddress, settings.supportEmail, settings.whatsapp].every(value => value.trim().length > 0);
}
