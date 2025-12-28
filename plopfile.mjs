export default function (plop) {
  plop.setGenerator('app', {
    description: 'Create a new app for a specific team in /apps',
    prompts: [
      {
        type: 'list',
        name: 'app_type',
        message: 'What kind of app?',
        choices: ['next-app']
      },
      {
        type: 'list',
        name: 'team',
        message: 'Which team does this belong to?',
        choices: ['games', 'core']
      },
      {
        type: 'input',
        name: 'name',
        message: 'What is the app name? (e.g. "marketing-site")'
      }
    ],
    actions: [
      {
        type: 'addMany',
        destination: 'apps/{{team}}/{{name}}',
        base: '_templates/app/{{app_type}}',
        templateFiles: '_templates/app/{{app_type}}/**'
      }
    ]
  });

  plop.setGenerator('library', {
    description: 'Create a new shared library in /libs',
    prompts: [
      {
        type: 'list',
        name: 'team',
        message: 'Which team does this belong to?',
        choices: ['core']
      },
      { type: 'input', name: 'name', message: 'Package name? (e.g. "auth" or "utils")' }
    ],
    actions: [
      {
        type: 'addMany',
        destination: 'libs/{{team}}/{{name}}',
        base: '_templates/lib',
        templateFiles: '_templates/lib/**'
      }
    ]
  });
}
