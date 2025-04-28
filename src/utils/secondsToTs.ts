export const secondsToTs = (sec: number, show_hours: boolean = false, decimal_points: number = 3): string => {
  const h = Math.floor(sec / 3600);
  let m = Math.floor((sec % 3600) / 60);
  let s = parseFloat((sec % 60).toFixed(decimal_points));
  if (s >= 60) {
      s = 0;
      m += 1;
  }
  let t = "";
  if (show_hours || sec >= 3600) {
      t = `${h}:`;
  }
  t += `${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s.toFixed(decimal_points) : s.toFixed(decimal_points)}`;
  return t;
};
