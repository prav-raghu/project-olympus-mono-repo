export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:4002/api/v1',
  msalConfig: {
    auth: {
      clientId: '',
      authority: 'https://login.microsoftonline.com/common',
      redirectUri: 'http://localhost:5173',
    },
  },
  apiScopes: [] as string[],
};
