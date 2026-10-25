export const errorMessages = {
  emptyfields: 'Please fill in all required fields.',
  wrongpwd: 'The password is incorrect.',
  usernotfound: 'No account was found with those login details.',
  invalidsteamid: 'SteamID64 must be exactly 17 digits.',
  steamidtaken: 'That SteamID64 is already registered.',
  invaliddiscordid: 'Discord ID must be 17 to 20 digits.',
  invaliduid: 'Username may only contain letters and numbers.',
  uidtaken: 'That username is already taken.',
  passwordcheck: 'Passwords do not match.',
  characterlimit: 'Names must be 35 characters or fewer.',
  passlength: 'Password must be at least 6 characters.',
  weakpass: 'Use a password with uppercase, lowercase, and a symbol.',
  signupfailed: 'Signup could not be completed. Please try again.',
  invalidaccounts: 'You cannot transfer to your own account.',
  recipientnotfound: 'No account was found for that SteamID.',
  invalidamount: 'Enter a valid transfer amount.',
  limitreached: 'The maximum transfer is $5,000.00.',
  insufficientfunds: 'Insufficient funds.',
  transferfailed: 'The transfer could not be completed. Please try again.',
  steamidrequired: 'Set your SteamID in your profile before sending a transfer.',
  updatefailed: 'Could not save your profile IDs. Please try again.',
  matchpwd: 'The new passwords do not match.',
  loggedout: 'Your session expired. Please sign in again.'
};

export function messageForError(code, fallback = 'The request could not be completed.') {
  return errorMessages[code] || fallback;
}
