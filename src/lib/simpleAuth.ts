interface SimpleCredentialCheckParams {
  username: string;
  password: string;
  expectedUsername: string;
  expectedPassword: string;
}

function normalizeUsername(value: string): string {
  return value.trim();
}

export function validateSimpleCredentials({
  username,
  password,
  expectedUsername,
  expectedPassword
}: SimpleCredentialCheckParams): boolean {
  return normalizeUsername(username) === normalizeUsername(expectedUsername) && password === expectedPassword;
}
