export default {
  prefixes: [
    'eventin://',
    'https://eventin.az'
  ],
  config: {
    initialRouteName: 'index',
    screens: {
      index: '',
      '(tabs)': {
        screens: {
          home: 'home',
          organisers: 'organisers',
          profile: 'profile',
          follows: 'follows',
          documents: 'documents'
        }
      },
      'event-details': {
        path: 'event-details/:id',
        parse: {
          id: (id) => id
        }
      },
      'organisers': {
        path: 'organisers/:id',
        parse: {
          id: (id) => id
        }
      },
      '(auth)': {
        screens: {
          login: 'login',
          register: 'register'
        }
      }
    }
  }
}; 