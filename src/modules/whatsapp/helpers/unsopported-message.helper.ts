export const UnsupportedMessage = (numMedia?: string, messageType?: string): boolean => {
  const mediaCount = Number.parseInt(numMedia ?? '0', 10);
  const normalizedMessageType = messageType?.trim().toLowerCase();

  if (Number.isFinite(mediaCount) && mediaCount > 0) {
    return true;
  }

  if (!normalizedMessageType) {
    return false;
  }

  return normalizedMessageType === 'audio' || normalizedMessageType === 'image';
};
