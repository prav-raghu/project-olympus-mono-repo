export const environment = {
  production: true,
  apiBaseUrl: '/api/v1',
  msalConfig: {
    auth: {
      clientId: '',
      authority: '',
      redirectUri: '/',
    },
  },
  apiScopes: [] as string[],
};
