// returns the current time in seconds since the epoch
export const epochTime = (date = Date.now()): number => Math.floor(date / 1000);

// returns the time in seconds since the epoch for a date that is hours from now
export const expiresAt = (hours = 1): number => epochTime() + hours * 60 * 60;

export const epochTimeToLocalDate = (epoch: number): Date => {
  let date = new Date(0);
  date.setUTCSeconds(epoch);
  return date;
};
