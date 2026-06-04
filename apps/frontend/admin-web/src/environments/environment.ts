export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:4000/api/v1',
  msalConfig: {
    auth: {
      clientId: '',
      authority: 'https://login.microsoftonline.com/common',
      redirectUri: 'http://localhost:4200',
    },
  },
  apiScopes: [] as string[],
};
