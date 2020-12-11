export default function (activationCode) {
  if (
    activationCode.length === 6 &&
    Number.parseInt(activationCode) >= 100000 &&
    Number.parseInt(activationCode) <= 999999
  ) {
    return true;
  } else {
    return false;
  }
}
