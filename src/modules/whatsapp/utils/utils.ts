export const setTimeLapse = (message: string): number => {
  let time = 7000;
  const len = message.trim().length;

  if (len < 15) {
    time = 20000;
  } else if (len < 30) {
    time = 10000;
  }

  console.log(time);

  return time;
};
