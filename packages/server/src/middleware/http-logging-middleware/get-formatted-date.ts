export function getFormattedDate(): string {
  let timestamp = new Date();
  let date = [timestamp.getFullYear(),
      (timestamp.getMonth() + 1),
      timestamp.getDate()].join('-');

  let time = [
    timestamp.getHours(),
    timestamp.getMinutes(),
    timestamp.getSeconds()].join(':');

  return [date, time].join(' ');
}
